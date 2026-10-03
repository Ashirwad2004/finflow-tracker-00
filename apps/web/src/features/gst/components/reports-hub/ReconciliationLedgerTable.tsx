import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, RefreshCw } from "lucide-react";
import { GstReconciliationData, GstPeriod } from "./types";

interface ReconciliationLedgerTableProps {
  recon: GstReconciliationData;
  activePeriod: GstPeriod;
  onRecalculate: () => void;
  formatCurrency: (amount: number) => string;
}

export const ReconciliationLedgerTable: React.FC<ReconciliationLedgerTableProps> = ({
  recon,
  activePeriod,
  onRecalculate,
  formatCurrency,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4 bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              GST Head-wise Tax Reconciliation Statement
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Comparison of Outward Liability (GSTR-1) vs Inward Tax Credit (GSTR-2B) for {activePeriod.label}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 h-8"
            onClick={onRecalculate}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 border-b font-bold text-muted-foreground">
              <tr>
                <th className="p-3">Tax Head</th>
                <th className="p-3 text-right">Output Tax (GSTR-1)</th>
                <th className="p-3 text-right">Input Credit (GSTR-2B)</th>
                <th className="p-3 text-right">Net Position</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 font-semibold">Integrated Tax (IGST)</td>
                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.igst)}</td>
                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(recon.itc.igst)}
                </td>
                <td className="p-3 text-right font-mono font-bold">
                  {recon.net.igst >= 0
                    ? formatCurrency(recon.net.igst)
                    : `(${formatCurrency(Math.abs(recon.net.igst))})`}
                </td>
                <td className="p-3 text-center">
                  {recon.net.igst > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">
                      Payable
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">
                      Credit Surplus
                    </Badge>
                  )}
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Central Tax (CGST)</td>
                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.cgst)}</td>
                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(recon.itc.cgst)}
                </td>
                <td className="p-3 text-right font-mono font-bold">
                  {recon.net.cgst >= 0
                    ? formatCurrency(recon.net.cgst)
                    : `(${formatCurrency(Math.abs(recon.net.cgst))})`}
                </td>
                <td className="p-3 text-center">
                  {recon.net.cgst > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">
                      Payable
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">
                      Credit Surplus
                    </Badge>
                  )}
                </td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">State / UT Tax (SGST)</td>
                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.sgst)}</td>
                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(recon.itc.sgst)}
                </td>
                <td className="p-3 text-right font-mono font-bold">
                  {recon.net.sgst >= 0
                    ? formatCurrency(recon.net.sgst)
                    : `(${formatCurrency(Math.abs(recon.net.sgst))})`}
                </td>
                <td className="p-3 text-center">
                  {recon.net.sgst > 0 ? (
                    <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 border-rose-200">
                      Payable
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">
                      Credit Surplus
                    </Badge>
                  )}
                </td>
              </tr>
              <tr className="bg-muted/40 font-bold border-t-2">
                <td className="p-3">Total GST Position</td>
                <td className="p-3 text-right font-mono">{formatCurrency(recon.output.total)}</td>
                <td className="p-3 text-right font-mono text-blue-600 dark:text-blue-400">
                  {formatCurrency(recon.itc.total)}
                </td>
                <td className="p-3 text-right font-mono text-primary text-sm font-extrabold">
                  {recon.net.payable > 0
                    ? formatCurrency(recon.net.payable)
                    : `Credit: ${formatCurrency(recon.net.credit)}`}
                </td>
                <td className="p-3 text-center">
                  {recon.net.payable > 0 ? (
                    <Badge className="bg-rose-600 text-white text-[10px]">Net Tax To Pay</Badge>
                  ) : (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Nil Payable / Refund</Badge>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
