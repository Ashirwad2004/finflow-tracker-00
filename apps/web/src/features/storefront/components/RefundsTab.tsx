import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";
import { PaymentRecord } from "../types";

interface RefundsTabProps {
  paymentsHistory: { payments: PaymentRecord[]; total: number };
  isLoadingHistory: boolean;
  formatCurrency: (amount: number) => string;
}

export function RefundsTab({
  paymentsHistory,
  isLoadingHistory,
  formatCurrency,
}: RefundsTabProps) {
  const refundedPayments = (paymentsHistory?.payments || []).filter((p) => p.status === "refunded");

  return (
    <div className="bg-card border rounded-xl shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Refunded Transactions Ledger</h2>
      </div>
      <div className="p-0">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : refundedPayments.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <RefreshCw className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No refunds processed</h3>
            <p className="text-xs text-muted-foreground">Successful refunds requested by users will appear here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Payment & Refund ID</TableHead>
                <TableHead>Refund Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refundedPayments.map((p: any) => {
                const refund = p.refunds?.[0] || {};
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold text-sm">{p.online_orders?.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{p.online_orders?.customer_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs truncate max-w-[150px]">{p.gateway_payment_id}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                        {refund.gateway_refund_id || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {refund.created_at
                        ? new Date(refund.created_at).toLocaleDateString()
                        : new Date(p.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-bold text-sm text-purple-700">
                      {formatCurrency(p.amount)}
                    </TableCell>
                    <TableCell className="text-xs italic text-muted-foreground">
                      {refund.reason || "Merchant Refund"}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 text-[10px]">
                        REFUNDED
                      </Badge>
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
