import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditLogEntry } from "../types";

interface PaymentAuditTabProps {
  auditLogs: { logs: AuditLogEntry[] };
  isLoadingLogs: boolean;
}

export function PaymentAuditTab({ auditLogs, isLoadingLogs }: PaymentAuditTabProps) {
  return (
    <div className="bg-card border rounded-xl shadow-sm">
      <div className="p-6 border-b flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">Payment Security & Audit Ledger</h2>
      </div>
      <div className="p-0">
        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !auditLogs.logs || auditLogs.logs.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-muted-foreground text-sm">No transaction audit logs recorded yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Transaction / Order ID</TableHead>
                <TableHead>Audit Parameters & Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.logs.map((log: any) => (
                <TableRow key={log.id} className="hover:bg-muted/10 font-medium">
                  <TableCell className="text-xs">
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        log.action === "payment_success"
                          ? "border-green-300 text-green-700 bg-green-50/50"
                          : log.action === "refund_success"
                          ? "border-purple-300 text-purple-700 bg-purple-50/50"
                          : log.action === "payment_failed"
                          ? "border-red-300 text-red-700 bg-red-50/50"
                          : "border-slate-350 text-slate-700 bg-slate-50/50"
                      }
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {log.ip_address || "System Event"}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[130px]">
                    {log.payments?.gateway_order_id || "N/A"}
                  </TableCell>
                  <TableCell
                    className="text-[10px] font-mono text-muted-foreground max-w-[200px] truncate"
                    title={JSON.stringify(log.details)}
                  >
                    {JSON.stringify(log.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
