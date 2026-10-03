import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, HelpCircle } from "lucide-react";

export const ComplianceNotes: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Statutory Filing Timelines (CBIC Rules)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
          <p>
            • <strong>GSTR-1</strong>: File monthly outward supplies by the <strong>11th</strong> of the subsequent month (or 13th for QRMP quarterly filers).
          </p>
          <p>
            • <strong>GSTR-2B</strong>: Static auto-drafted ITC statement generated on the <strong>14th</strong> of the subsequent month.
          </p>
          <p>
            • <strong>GSTR-3B</strong>: Summary return & tax payment due on the <strong>20th</strong> of the subsequent month.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            Input Tax Credit Utilization Order (Section 49)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
          <p>
            • <strong>IGST Credit</strong> must be exhausted 100% first against IGST liability, then CGST & SGST in any proportion.
          </p>
          <p>
            • <strong>CGST Credit</strong> offsets CGST liability, then IGST. (Never against SGST).
          </p>
          <p>
            • <strong>SGST Credit</strong> offsets SGST liability, then IGST. (Never against CGST).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
