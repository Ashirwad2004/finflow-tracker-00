import React, { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Percent,
  Copy,
  Check,
  ShieldCheck,
  Minus,
  Plus,
  History,
  Info,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  formatINR,
  numberToIndianWords,
  GST_SLABS,
  SPECIAL_SLABS,
  GSTCalculationHistory,
} from "./calculatorUtils";

export const GstStudioTab: React.FC = () => {
  const [calcType, setCalcType] = useState<"exclusive" | "inclusive">("exclusive");
  const [amountStr, setAmountStr] = useState<string>("10000");
  const [gstRate, setGstRate] = useState<number>(18);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [customRateStr, setCustomRateStr] = useState<string>("18");
  const [supplyType, setSupplyType] = useState<"intra" | "inter">("intra"); // intra = CGST+SGST, inter = IGST
  const [cessRateStr, setCessRateStr] = useState<string>("0");
  const [isRCM, setIsRCM] = useState<boolean>(false); // Reverse Charge Mechanism
  const [enableTDS, setEnableTDS] = useState<boolean>(false); // GST TDS (2% Section 51)
  const [copied, setCopied] = useState<boolean>(false);
  const [gstHistory, setGstHistory] = useState<GSTCalculationHistory[]>([]);

  const parsedAmount = Math.max(0, parseFloat(amountStr) || 0);
  const effectiveGstRate = isCustomRate
    ? Math.max(0, parseFloat(customRateStr) || 0)
    : gstRate;
  const parsedCessRate = Math.max(0, parseFloat(cessRateStr) || 0);

  // CA Statutory GST Computation
  const gstResults = useMemo(() => {
    let baseAmount = 0;
    let totalTax = 0;
    let grossAmount = 0;
    let cessAmount = 0;

    const totalRate = effectiveGstRate + parsedCessRate;

    if (calcType === "exclusive") {
      // Amount entered is Taxable (Base) Value
      baseAmount = parsedAmount;
      const gstAmount = Math.round((baseAmount * (effectiveGstRate / 100)) * 100) / 100;
      cessAmount = Math.round((baseAmount * (parsedCessRate / 100)) * 100) / 100;
      totalTax = gstAmount + cessAmount;
      grossAmount = Math.round((baseAmount + totalTax) * 100) / 100;
    } else {
      // Amount entered is Inclusive of Tax (MRP / Gross Value)
      grossAmount = parsedAmount;
      baseAmount =
        totalRate > 0
          ? Math.round((grossAmount / (1 + totalRate / 100)) * 100) / 100
          : grossAmount;
      totalTax = Math.round((grossAmount - baseAmount) * 100) / 100;
      cessAmount =
        parsedCessRate > 0 && totalRate > 0
          ? Math.round((totalTax * (parsedCessRate / totalRate)) * 100) / 100
          : 0;
    }

    const netGstOnly = Math.max(0, totalTax - cessAmount);

    // Intra-State: Split into CGST (50%) and SGST (50%)
    const cgstRate = effectiveGstRate / 2;
    const sgstRate = effectiveGstRate / 2;
    const cgstAmount = Math.round((netGstOnly / 2) * 100) / 100;
    const sgstAmount = Math.round((netGstOnly - cgstAmount) * 100) / 100;

    // Inter-State: Full IGST (100%)
    const igstRate = effectiveGstRate;
    const igstAmount = netGstOnly;

    // GST TDS (2% on Base Amount under Section 51)
    const tdsRate = enableTDS ? 2 : 0;
    const tdsAmount = enableTDS ? Math.round((baseAmount * 0.02) * 100) / 100 : 0;
    const netReceivable = isRCM
      ? baseAmount
      : Math.round((grossAmount - tdsAmount) * 100) / 100;

    return {
      baseAmount,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      cessRate: parsedCessRate,
      cessAmount,
      totalGst: netGstOnly,
      totalTax,
      grossAmount,
      tdsRate,
      tdsAmount,
      netReceivable,
    };
  }, [calcType, parsedAmount, effectiveGstRate, parsedCessRate, enableTDS, isRCM]);

  // Save to calculation history
  const handleSaveToHistory = useCallback(() => {
    if (parsedAmount <= 0) return;
    const item: GSTCalculationHistory = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: calcType,
      baseAmount: gstResults.baseAmount,
      rate: effectiveGstRate,
      cess: parsedCessRate,
      totalTax: gstResults.totalTax,
      grossAmount: gstResults.grossAmount,
      supplyType,
    };
    setGstHistory((prev) => [item, ...prev.slice(0, 4)]);
  }, [parsedAmount, calcType, gstResults, effectiveGstRate, parsedCessRate, supplyType]);

  // Copy formal CA Invoice Breakdown to clipboard
  const handleCopyBreakdown = () => {
    const text = `🧾 GST TAX INVOICE COMPUTATION
----------------------------------------
Supply Type: ${supplyType === "intra" ? "Intra-State (CGST + SGST)" : "Inter-State (IGST)"}
Mode: ${calcType === "exclusive" ? "Tax Exclusive (Added to Base)" : "Tax Inclusive (Extracted from Gross)"}
----------------------------------------
Taxable (Base) Value:  ${formatINR(gstResults.baseAmount)}
${
  supplyType === "intra"
    ? `CGST (@ ${gstResults.cgstRate}%):       ${formatINR(gstResults.cgstAmount)}
SGST (@ ${gstResults.sgstRate}%):       ${formatINR(gstResults.sgstAmount)}`
    : `IGST (@ ${gstResults.igstRate}%):       ${formatINR(gstResults.igstAmount)}`
}
${gstResults.cessAmount > 0 ? `Compensation Cess:      ${formatINR(gstResults.cessAmount)}\n` : ""}Total GST Tax:         ${formatINR(gstResults.totalTax)}
----------------------------------------
Total Invoice Value:   ${formatINR(gstResults.grossAmount)}
In Words: ${numberToIndianWords(gstResults.grossAmount)}
${isRCM ? "\n⚠️ Reverse Charge Applicable (Sec 9(3)/9(4)): Tax payable directly by recipient.\n" : ""}${enableTDS ? `GST TDS Deducted (2%):  ${formatINR(gstResults.tdsAmount)}\nNet Disbursable:       ${formatINR(gstResults.netReceivable)}\n` : ""}----------------------------------------
Calculated with FinFlow Pro CA Studio`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Breakdown Copied!",
      description: "GST statutory computation copied to clipboard in professional format.",
    });
    setTimeout(() => setCopied(false), 2500);
  };

  // Quick Amount Presets
  const addAmountPreset = (add: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + add));
  };

  return (
    <div className="space-y-4 mt-3">
      {/* Mode Switch: Add GST vs Remove GST */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
        <button
          type="button"
          onClick={() => setCalcType("exclusive")}
          className={cn(
            "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
            calcType === "exclusive"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add GST (Exclusive)</span>
        </button>
        <button
          type="button"
          onClick={() => setCalcType("inclusive")}
          className={cn(
            "py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
            calcType === "inclusive"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Minus className="w-3.5 h-3.5" />
          <span>Remove GST (Inclusive)</span>
        </button>
      </div>

      {/* Amount Input Card */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {calcType === "exclusive" ? "Taxable / Base Amount" : "Gross / MRP Amount (Tax Inclusive)"}
          </Label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            INR (₹)
          </span>
        </div>

        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-xl font-bold text-muted-foreground">₹</span>
          <Input
            type="number"
            min="0"
            step="any"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            className="pl-8 text-2xl font-bold h-13 rounded-xl border-primary/20 focus-visible:ring-primary"
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[1000, 5000, 10000, 50000, 100000].map((val) => (
            <Button
              key={val}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addAmountPreset(val)}
              className="h-7 text-[11px] px-2.5 rounded-lg hover:bg-primary/10 hover:text-primary border-border/60"
            >
              +{val >= 100000 ? `${val / 100000}L` : `${val / 1000}k`}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAmountStr("0")}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive ml-auto"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Statutory GST Slabs Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-primary" />
            <span>Statutory GST Slabs</span>
          </Label>
          <button
            type="button"
            onClick={() => setIsCustomRate(!isCustomRate)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {isCustomRate ? "Use Standard Slabs" : "Custom Rate %"}
          </button>
        </div>

        {isCustomRate ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={customRateStr}
              onChange={(e) => setCustomRateStr(e.target.value)}
              placeholder="Enter GST %"
              className="h-10 text-sm font-bold rounded-xl"
            />
            <span className="text-sm font-bold">%</span>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {GST_SLABS.map((slab) => {
              const isSelected = gstRate === slab.rate && !isCustomRate;
              return (
                <button
                  key={slab.rate}
                  type="button"
                  onClick={() => {
                    setGstRate(slab.rate);
                    setIsCustomRate(false);
                  }}
                  className={cn(
                    "py-2.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/50 text-foreground"
                  )}
                >
                  <span className="text-sm font-extrabold">{slab.rate}%</span>
                  <span className="text-[9px] text-muted-foreground truncate w-full px-0.5">
                    {slab.rate === 0 ? "Exempt" : slab.rate === 18 ? "Standard" : "Slab"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Special Slabs (Jewellery 3%, Diamonds 0.25%) */}
        {!isCustomRate && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Special:</span>
            {SPECIAL_SLABS.map((special) => (
              <button
                key={special.rate}
                type="button"
                onClick={() => {
                  setGstRate(special.rate);
                  setIsCustomRate(false);
                }}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg border transition-all font-medium",
                  gstRate === special.rate
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 font-bold"
                    : "border-border/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {special.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Supply Type & Statutory Clauses */}
      <div className="p-3 bg-muted/20 border border-border/50 rounded-2xl space-y-3">
        {/* Supply Type Toggle: Intra vs Inter */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold text-foreground">Supply Jurisdiction</Label>
            <p className="text-[11px] text-muted-foreground">
              {supplyType === "intra"
                ? "Intra-State (Same State) -> CGST + SGST"
                : "Inter-State (Out of State / Export) -> IGST"}
            </p>
          </div>
          <div className="flex items-center bg-background p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setSupplyType("intra")}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md font-bold transition-all",
                supplyType === "intra" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              Intra-State
            </button>
            <button
              type="button"
              onClick={() => setSupplyType("inter")}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md font-bold transition-all",
                supplyType === "inter" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              Inter-State
            </button>
          </div>
        </div>

        {/* Compensation Cess & Advanced Clauses */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground">Compensation Cess %</Label>
            <div className="flex items-center gap-1.5 mt-1">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={cessRateStr}
                onChange={(e) => setCessRateStr(e.target.value)}
                placeholder="0"
                className="h-8 text-xs font-bold"
              />
              <span className="text-xs font-bold text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex flex-col justify-end space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rcm-toggle" className="text-[11px] font-bold cursor-pointer">
                RCM (Sec 9(3))
              </Label>
              <Switch id="rcm-toggle" checked={isRCM} onCheckedChange={setIsRCM} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tds-toggle" className="text-[11px] font-bold cursor-pointer">
                GST TDS (2%)
              </Label>
              <Switch id="tds-toggle" checked={enableTDS} onCheckedChange={setEnableTDS} />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* STATUTORY TAX BREAKDOWN DISPLAY (CA GRADE) */}
      {/* ========================================== */}
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
              {formatINR(enableTDS ? gstResults.netReceivable : gstResults.grossAmount)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
            In words: {numberToIndianWords(enableTDS ? gstResults.netReceivable : gstResults.grossAmount)}
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
            onClick={handleCopyBreakdown}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 rounded-xl gap-2 shadow-lg shadow-emerald-950/40"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied Breakdown" : "Copy CA Breakdown"}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveToHistory}
            className="border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200 h-10 px-3 rounded-xl"
            title="Save calculation snapshot"
          >
            <History className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Quick History Log */}
      {gstHistory.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Recent Computations
          </Label>
          <div className="space-y-1">
            {gstHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setAmountStr(String(item.type === "exclusive" ? item.baseAmount : item.grossAmount));
                  setGstRate(item.rate);
                  setCalcType(item.type);
                }}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/80 text-xs cursor-pointer transition-all border border-border/40"
              >
                <span className="font-semibold text-muted-foreground">{item.timestamp}</span>
                <span className="font-bold">
                  {formatINR(item.baseAmount)} + {item.rate}% GST
                </span>
                <span className="font-mono font-bold text-primary">{formatINR(item.grossAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
