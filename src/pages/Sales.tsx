import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import { Download, Plus, Printer, Search, Pencil, MoreVertical, FileText } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SalesPage = () => {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingInvoice, setEditingInvoice] = useState<any>(null); // State for editing
    const { user } = useAuth();
    const { formatCurrency } = useCurrency();

    const handlePreview = (invoice: any) => {
        const url = generateInvoicePDF({
            invoice_number: invoice.invoice_number,
            date: invoice.date,
            customer_name: invoice.customer_name,
            items: invoice.items || [],
            subtotal: invoice.subtotal || invoice.total_amount,
            tax_amount: invoice.tax_amount || 0,
            total_amount: invoice.total_amount,
            tax_rate: 0
        }, { action: 'preview' });

        if (url) {
            window.open(String(url), '_blank');
        }
    };

    interface Sale {
        id: string;
        user_id: string;
        customer_name: string;
        invoice_number: string;
        status: 'paid' | 'pending' | 'overdue';
        total_amount: number;
        subtotal?: number;
        tax_amount?: number;
        date: string;
        items: any[];
    }

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ["sales", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sales" as any)
                .select("*")
                .eq("user_id", user?.id)
                .order("date", { ascending: false });

            if (error) throw error;
            return data as any as Sale[];
        },
        enabled: !!user
    });

    const filteredInvoices = invoices.filter(inv =>
        inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (invoice: any) => {
        setEditingInvoice(invoice);
        setIsCreateOpen(true);
    };

    return (
        <AppLayout>
            <div className="container mx-auto p-4 animate-fade-in space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Sales & Invoices</h1>
                        <p className="text-muted-foreground">Manage your customer invoices</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Invoice
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by customer or invoice #"
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Invoice List */}
                {isLoading ? (
                    <div className="text-center py-8">Loading invoices...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="border rounded-lg p-12 text-center text-muted-foreground bg-card flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            <Printer className="w-6 h-6 opacity-50" />
                        </div>
                        <p>No invoices found. Start by creating a new invoice.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredInvoices.map((invoice) => (
                            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold">{invoice.invoice_number}</span>
                                            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                                                {invoice.status}
                                            </Badge>
                                        </div>
                                        <h3 className="text-lg font-medium">{invoice.customer_name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(invoice.date), "MMM d, yyyy")}
                                        </p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div>
                                            <p className="text-xl font-bold">{formatCurrency(invoice.total_amount)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {invoice.items?.length || 0} items
                                            </p>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handlePreview(invoice)}>
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Preview Invoice
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => generateInvoicePDF({
                                                    invoice_number: invoice.invoice_number,
                                                    date: invoice.date,
                                                    customer_name: invoice.customer_name,
                                                    items: invoice.items || [],
                                                    subtotal: invoice.subtotal || invoice.total_amount,
                                                    tax_amount: invoice.tax_amount || 0,
                                                    total_amount: invoice.total_amount,
                                                    tax_rate: 0
                                                }, { action: 'download' })}>
                                                    <Download className="w-4 h-4 mr-2" />
                                                    Download PDF
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                                                    <Pencil className="w-4 h-4 mr-2" />
                                                    Edit Invoice
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <CreateInvoiceDialog
                    open={isCreateOpen}
                    onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) setEditingInvoice(null);
                    }}
                    invoiceToEdit={editingInvoice}
                />
            </div>
        </AppLayout>
    );
};

export default SalesPage;
