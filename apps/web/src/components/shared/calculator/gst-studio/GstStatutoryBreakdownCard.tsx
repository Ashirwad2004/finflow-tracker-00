import React from "react";
import { ShieldCheck, Info, Check, Copy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, numberToIndianWords } from "../calculatorUtils";
import { SupplyType, GstResults } from "./types";

interface GstStatutoryBreakdownCardProps {
  gstResults: GstResults;
  supplyType: SupplyType;
  enableTDS: boolean;
  isRCM: boolean;
  copied: boolean;
  onCopyBreakdown: () => void;
  onSaveToHistory: () => void;
}

export const GstStatutoryBreakdownCard: React.FC<GstStatutoryBreakdownCardProps> = ({
  gstResults,
  supplyType,
  enableTDS,
  isRCM,
  copied,
  onCopyBreakdown,
  onSaveToHistory,
}) => {
  const finalDisplayAmount = enableTDS ? gstResults.netReceivable : gstResults.grossAmount;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Statutory Tax Breakdown
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
          GST Ready
        </Badge>
      </div>

      {/* Line items table */}
      <div className="space-y-2 text-xs sm:text-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-slate-400">Taxable (Base) Value:</span>
          <span className="font-mono font-bold text-slate-100">{formatINR(gstResults.baseAmount)}</span>
        </div>

        {supplyType === "intra" ? (
          <>
            <div className="flex items-center justify-between py-1 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                CGST ({gstResults.cgstRate}%):
              </span>
              <span className="font-mono font-semibold">{formatINR(gstResults.cgstAmount)}</span>
            </div>
            <div className="flex items-center justify-between py-1 text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                SGST ({gstResults.sgstRate}%):
              </span>
              <span className="font-mono font-semibold">{formatINR(gstResults.sgstAmount)}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between py-1 text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              IGST ({gstResults.igstRate}%):
            </span>
            <span className="font-mono font-semibold">{formatINR(gstResults.igstAmount)}</span>
          </div>
        )}

        {gstResults.cessAmount > 0 && (
          <div className="flex items-center justify-between py-1 text-amber-300">
            <span>Compensation Cess ({gstResults.cessRate}%):</span>
            <span className="font-mono font-semibold">{formatINR(gstResults.cessAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between py-1 text-emerald-400 font-semibold border-t border-slate-800/80 pt-2">
          <span>Total GST Tax:</span>
          <span className="font-mono">{formatINR(gstResults.totalTax)}</span>
        </div>

        {enableTDS && (
          <div className="flex items-center justify-between py-1 text-rose-400">
            <span>Less: GST TDS (2% Sec 51):</span>
            <span className="font-mono">-{formatINR(gstResults.tdsAmount)}</span>
          </div>
        )}
      </div>

      {/* Total Gross / Final Invoice Amount */}
      <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
            {enableTDS ? "Net Disbursable Amount" : "Total Invoice Value (Gross)"}
          </span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatINR(finalDisplayAmount)}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
          In words: {numberToIndianWords(finalDisplayAmount)}
        </p>
      </div>

      {/* RCM Warning if active */}
      {isRCM && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200">
            <strong>Reverse Charge Notice:</strong> GST liability of {formatINR(gstResults.totalTax)} is payable
            directly to the Government by the recipient via Electronic Cash Ledger.
          </p>
        </div>
      )}

      {/* Actions: Copy & Save */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={onCopyBreakdown}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-xl gap-2 shadow-lg shadow-emerald-950/40"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied Breakdown" : "Copy CA Breakdown"}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveToHistory}
          className="border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200 h-10 px-3 rounded-xl"
          title="Save calculation snapshot"
        >
          <History className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
