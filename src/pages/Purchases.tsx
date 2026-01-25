import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingBag, Search, Pencil } from "lucide-react";
import { RecordPurchaseDialog } from "@/components/RecordPurchaseDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const PurchasesPage = () => {
    const [isRecordOpen, setIsRecordOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingPurchase, setEditingPurchase] = useState<any>(null); // State for editing
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();

    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ["purchases", user?.id],
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await supabase
                .from("purchases" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });

            if (error) throw error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data as any[];
        },
        enabled: !!user
    });

    const filteredPurchases = purchases.filter(purchase =>
        purchase.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (purchase: any) => {
        setEditingPurchase(purchase);
        setIsRecordOpen(true);
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-4 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Purchases & Bills</h1>
                        <p className="text-muted-foreground">Track your business expenses and bills</p>
                    </div>
                    <Button onClick={() => setIsRecordOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Record Purchase
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by vendor or bill #"
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Purchase List */}
                {isLoading ? (
                    <div className="text-center py-8">Loading purchases...</div>
                ) : filteredPurchases.length === 0 ? (
                    <div className="border rounded-lg p-12 text-center text-muted-foreground bg-card flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 opacity-50" />
                        </div>
                        <p>No purchases found. Record your first business purchase.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredPurchases.map((purchase) => (
                            <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-lg">{purchase.vendor_name}</span>
                                            {purchase.bill_number && (
                                                <Badge variant="outline">
                                                    {purchase.bill_number}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(purchase.date), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div>
                                            <p className="text-xl font-bold text-destructive">-{formatCurrency(purchase.total_amount)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {purchase.items?.length || 0} items
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8"
                                            onClick={() => handleEdit(purchase)}
                                        >
                                            <Pencil className="w-3 h-3 mr-1" /> Edit
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

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
