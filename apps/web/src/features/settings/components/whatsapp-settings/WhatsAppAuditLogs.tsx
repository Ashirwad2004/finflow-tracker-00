import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, FileText } from "lucide-react";
import { format } from "date-fns";

interface WhatsAppAuditLogsProps {
  logs: any[];
}

export const WhatsAppAuditLogs: React.FC<WhatsAppAuditLogsProps> = ({ logs }) => {
  return (
    <Card className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Recent WhatsApp Delivery Logs
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Audit trail of invoices, receipts, and reminders delivered to customers.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No WhatsApp messages sent yet. Messages sent via invoices or receipts will show up here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Recipient</th>
                  <th className="px-4 py-2.5">Attachment</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {format(new Date(log.created_at), "dd MMM, hh:mm a")}
                    </td>
                    <td className="px-4 py-2.5 font-semibold capitalize text-slate-800 dark:text-slate-200">
                      {log.message_type}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                      {log.phone_number}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {log.has_attachment ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                          <FileText className="w-3 h-3" />
                          {log.attachment_filename || "PDF"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          log.status === "sent"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : log.status === "failed"
                            ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
