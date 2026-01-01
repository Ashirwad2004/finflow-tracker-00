import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExtractedBillData {
  merchant_name: string | null;
  total_amount: number | null;
  bill_date: string | null;
  tax_amount: number | null;
  category_suggestion: string | null;
}

interface BillUploadProps {
  onDataExtracted: (data: ExtractedBillData) => void;
  onFileUploaded: (file: File, preview: string) => void;
  uploadedPreview: string | null;
  onClearFile: () => void;
}

export const BillUpload = ({
  onDataExtracted,
  onFileUploaded,
  uploadedPreview,
  onClearFile,
}: BillUploadProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    onFileUploaded(file, preview);

    // Start OCR scanning
    await scanBill(file);
  };

  const scanBill = async (file: File) => {
    setIsScanning(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke('scan-bill', {
        body: {
          imageBase64: base64,
          mimeType: file.type,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "OCR Warning",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.success && data.data) {
        onDataExtracted(data.data);
        toast({
          title: "Bill scanned successfully",
          description: "Data has been auto-filled. Please review and edit if needed.",
        });
      }
    } catch (error: any) {
      console.error('OCR error:', error);
      toast({
        title: "Scan failed",
        description: error.message || "Failed to scan bill. Please enter details manually.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Upload Bill (Optional)</span>
      </div>

      {!uploadedPreview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Click to upload bill image or PDF
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            JPG, PNG, PDF (max 10MB)
          </p>
        </div>
      ) : (
        <div className="relative border rounded-lg p-3 bg-muted/30">
          <div className="flex items-center gap-3">
            {uploadedPreview.endsWith('.pdf') ? (
              <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={uploadedPreview}
                alt="Bill preview"
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">Bill uploaded</p>
              {isScanning ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Scanning bill...
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Data extracted successfully
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onClearFile();
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>
          {uploadedPreview && (
            <img
              src={uploadedPreview}
              alt="Bill full preview"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
