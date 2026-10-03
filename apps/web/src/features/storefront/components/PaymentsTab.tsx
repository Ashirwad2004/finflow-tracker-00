import { Search, FileText, Download, FileMinus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateInvoicePDF } from "@/core/utils/invoiceGenerator";
import { PaymentRecord } from "../types";

interface PaymentsTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  paymentsHistory: { payments: PaymentRecord[]; total: number };
  isLoadingHistory: boolean;
  storeProfile: any;
  formatCurrency: (amount: number) => string;
  onOpenRefund: (paymentId: string, amount: string) => void;
}

export function PaymentsTab({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  paymentsHistory,
  isLoadingHistory,
  storeProfile,
  formatCurrency,
  onOpenRefund,
}: PaymentsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/30 border p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-background"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-background">
              <SelectValue placeholder="All Payments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">All Payments</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !paymentsHistory.payments || paymentsHistory.payments.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No payment transactions</h3>
            <p className="text-xs text-muted-foreground">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice & Gateway ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentsHistory.payments.map((p: any) => {
                const invNum = p.invoices?.[0]?.invoice_number || "Pending";
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold text-sm">
                        {p.online_orders?.customer_name ?? "Walk-in Guest"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {p.online_orders?.customer_phone ?? "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{invNum}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate max-w-[150px]">
                        {p.gateway_payment_id || p.gateway_order_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-bold text-sm">
                      {formatCurrency(p.amount)}
                    </TableCell>
                    <TableCell className="text-xs uppercase font-medium text-muted-foreground">
                      {p.payment_method || "online"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "success"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100 text-[10px]"
                            : p.status === "refunded"
                            ? "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 text-[10px]"
                            : p.status === "failed"
                            ? "bg-rose-100 text-rose-700 border-rose-300 hover:bg-rose-100 text-[10px]"
                            : "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 text-[10px]"
                        }
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      {p.status === "success" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => {
                              generateInvoicePDF({
                                invoiceNumber: invNum,
                                date: new Date(p.created_at).toLocaleDateString(),
                                storeName: storeProfile?.business_name || "RupeeBill Shop Store",
                                customerName: p.online_orders?.customer_name || "Customer",
                                customerPhone: p.online_orders?.customer_phone || "",
                                customerAddress: p.online_orders?.customer_address || "",
                                items:
                                  p.online_orders?.online_order_items?.map((it: any) => ({
                                    name: it.products?.name ?? "Product Item",
                                    quantity: it.quantity || 1,
                                    price: Number(it.price_at_time || 0),
                                  })) || [],
                                subtotal: Number(p.amount) - Number(p.online_orders?.delivery_charge || 0),
                                deliveryCharge: Number(p.online_orders?.delivery_charge || 0),
                                totalAmount: Number(p.amount),
                                paymentMethod: p.payment_method || "online",
                                status: p.status,
                              });
                            }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Invoice
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 rounded-lg text-xs"
                            onClick={() => {
                              onOpenRefund(p.id, p.amount.toString());
                            }}
                          >
                            <FileMinus className="w-3.5 h-3.5 mr-1" />
                            Refund
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
