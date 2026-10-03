import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Scale, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { GstReconciliationData } from "./types";

interface ReconciliationSummaryCardsProps {
  recon: GstReconciliationData;
  formatCurrency: (amount: number) => string;
}

export const ReconciliationSummaryCards: React.FC<ReconciliationSummaryCardsProps> = ({
  recon,
  formatCurrency,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-orange-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Output Tax (Sales)</p>
            <ArrowUpRight className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(recon.output.total)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Taxable: {formatCurrency(recon.outwardTaxable)} ({recon.salesCount} invoices)
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Input Tax Credit (ITC)</p>
            <ArrowDownRight className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(recon.itc.total)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Taxable: {formatCurrency(recon.inwardTaxable)} ({recon.purchasesCount} bills)
          </p>
        </CardContent>
      </Card>

      <Card className={`border-l-4 ${recon.net.payable > 0 ? "border-l-rose-500" : "border-l-emerald-500"}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Net Cash Tax Payable</p>
            <ShieldCheck className={`w-4 h-4 ${recon.net.payable > 0 ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(recon.net.payable)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {recon.net.payable > 0 ? "To be paid in Cash Ledger" : "Fully covered by Input Tax Credit"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">ITC Balance Carried Forward</p>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">
            {formatCurrency(recon.net.credit)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Surplus credit available for future returns
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
