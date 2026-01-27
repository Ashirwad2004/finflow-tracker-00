import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, Search, Pencil, Upload, Loader2 } from "lucide-react";
import { RecordPurchaseDialog } from "@/components/RecordPurchaseDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

const PurchasesPage = () => {
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const { user } = useAuth();
  const { formatCurrency } = useCurrency();

  /* ---------------- Fetch Purchases ---------------- */
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  /* ---------------- Search Filter ---------------- */
  const filteredPurchases = purchases.filter((purchase) =>
    purchase.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ---------------- Edit Purchase ---------------- */
  const handleEdit = (purchase: any) => {
    setEditingPurchase(purchase);
    setIsRecordOpen(true);
  };

  /* ---------------- Bill Upload + OCR (Fixed) ---------------- */
  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate user authentication
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload bills",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, WEBP) or PDF file",
        variant: "destructive"
      });
      e.target.value = "";
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      e.target.value = "";
      return;
    }

    setUploading(true);

    try {
      // Step 1: Check if bills bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Buckets error:", bucketsError);
        throw new Error("Failed to access storage");
      }

      const billsBucket = buckets?.find(b => b.name === 'bills');
      
      if (!billsBucket) {
        throw new Error("Bills storage bucket not found. Please contact support.");
      }

      // Step 2: Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log("Uploading to path:", filePath);

      // Step 3: Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bills")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message || "Failed to upload file");
      }

      console.log("Upload successful:", uploadData);

      // Step 4: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("bills")
        .getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      // Step 5: Call Edge Function for OCR (if available)
      let ocrData = null;
      try {
        const { data, error: functionError } = await supabase.functions.invoke("scan-bill", {
          body: { path: filePath, url: publicUrl }
        });

        if (functionError) {
          console.warn("OCR function error (will use manual entry):", functionError);
          // Continue without OCR - user can enter manually
        } else {
          ocrData = data;
          console.log("OCR data:", ocrData);
        }
      } catch (ocrError) {
        console.warn("OCR not available:", ocrError);
        // OCR is optional - continue without it
      }

      // Step 6: Auto-fill dialog with OCR data or defaults
      setEditingPurchase({
        vendor_name: ocrData?.vendor || "",
        bill_number: ocrData?.bill_number || "",
        date: ocrData?.date || new Date().toISOString().split('T')[0],
        total_amount: ocrData?.total || 0,
        items: ocrData?.items || [],
        bill_url: publicUrl, // Store the bill URL
        bill_path: filePath // Store the path for deletion if needed
      });

      setIsRecordOpen(true);

      toast({
        title: ocrData ? "Bill scanned successfully" : "Bill uploaded successfully",
        description: ocrData 
          ? "Details auto-filled from bill" 
          : "Please enter bill details manually"
      });

    } catch (err: any) {
      console.error("Bill upload error:", err);
      
      // Provide specific error messages
      let errorMessage = "Please try again or enter details manually";
      
      if (err.message?.includes("not found")) {
        errorMessage = "Storage not configured. Please contact support.";
      } else if (err.message?.includes("permission")) {
        errorMessage = "Permission denied. Please check your account settings.";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast({
        title: "Bill upload failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Open dialog for manual entry
      setEditingPurchase({
        vendor_name: "",
        bill_number: "",
        date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        items: []
      });
      setIsRecordOpen(true);
      
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset file input
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Purchases & Bills</h1>
            <p className="text-muted-foreground">
              Track your business expenses and bills
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" disabled={uploading || !user}>
              <label className="flex items-center gap-2 cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Bill
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  hidden
                  disabled={uploading || !user}
                  onChange={handleBillUpload}
                />
              </label>
            </Button>

            <Button 
              onClick={() => {
                setEditingPurchase(null);
                setIsRecordOpen(true);
              }}
              disabled={!user}
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Purchase
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by vendor or bill #"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading purchases...</p>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground bg-card flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 opacity-50" />
            </div>
            <p className="font-medium">No purchases found</p>
            <p className="text-sm">
              {searchTerm 
                ? "Try a different search term" 
                : "Upload a bill or record a new purchase to get started"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPurchases.map((purchase) => (
              <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="font-semibold">
                        {purchase.vendor_name || "Unknown Vendor"}
                      </span>
                      {purchase.bill_number && (
                        <Badge variant="outline">
                          #{purchase.bill_number}
                        </Badge>
                      )}
                      {purchase.bill_url && (
                        <Badge variant="secondary" className="text-xs">
                          <Upload className="w-3 h-3 mr-1" />
                          Bill Attached
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(purchase.date), "MMM d, yyyy")}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-bold text-destructive text-lg">
                      -{formatCurrency(purchase.total_amount)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(purchase)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog */}
        <RecordPurchaseDialog
          open={isRecordOpen}
          onOpenChange={(open) => {
            setIsRecordOpen(open);
            if (!open) setEditingPurchase(null);
          }}
          purchaseToEdit={editingPurchase}
        />

      </div>
    </AppLayout>
  );
};

export default PurchasesPage;