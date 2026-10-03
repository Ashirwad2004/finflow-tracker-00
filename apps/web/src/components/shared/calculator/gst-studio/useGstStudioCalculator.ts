import { useState, useCallback, useMemo } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  formatINR,
  numberToIndianWords,
  GSTCalculationHistory,
} from "../calculatorUtils";
import { CalcType, SupplyType, GstResults } from "./types";

export function useGstStudioCalculator() {
  const [calcType, setCalcType] = useState<CalcType>("exclusive");
  const [amountStr, setAmountStr] = useState<string>("10000");
  const [gstRate, setGstRate] = useState<number>(18);
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [customRateStr, setCustomRateStr] = useState<string>("18");
  const [supplyType, setSupplyType] = useState<SupplyType>("intra");
  const [cessRateStr, setCessRateStr] = useState<string>("0");
  const [isRCM, setIsRCM] = useState<boolean>(false);
  const [enableTDS, setEnableTDS] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [gstHistory, setGstHistory] = useState<GSTCalculationHistory[]>([]);

  const parsedAmount = Math.max(0, parseFloat(amountStr) || 0);
  const effectiveGstRate = isCustomRate
    ? Math.max(0, parseFloat(customRateStr) || 0)
    : gstRate;
  const parsedCessRate = Math.max(0, parseFloat(cessRateStr) || 0);

  // CA Statutory GST Computation
  const gstResults: GstResults = useMemo(() => {
    let baseAmount = 0;
    let totalTax = 0;
    let grossAmount = 0;
    let cessAmount = 0;

    const totalRate = effectiveGstRate + parsedCessRate;

    if (calcType === "exclusive") {
      baseAmount = parsedAmount;
      const gstAmount = Math.round((baseAmount * (effectiveGstRate / 100)) * 100) / 100;
      cessAmount = Math.round((baseAmount * (parsedCessRate / 100)) * 100) / 100;
      totalTax = gstAmount + cessAmount;
      grossAmount = Math.round((baseAmount + totalTax) * 100) / 100;
    } else {
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

    const cgstRate = effectiveGstRate / 2;
    const sgstRate = effectiveGstRate / 2;
    const cgstAmount = Math.round((netGstOnly / 2) * 100) / 100;
    const sgstAmount = Math.round((netGstOnly - cgstAmount) * 100) / 100;

    const igstRate = effectiveGstRate;
    const igstAmount = netGstOnly;

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

  const addAmountPreset = (add: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + add));
  };

  return {
    calcType,
    setCalcType,
    amountStr,
    setAmountStr,
    gstRate,
    setGstRate,
    isCustomRate,
    setIsCustomRate,
    customRateStr,
    setCustomRateStr,
    supplyType,
    setSupplyType,
    cessRateStr,
    setCessRateStr,
    isRCM,
    setIsRCM,
    enableTDS,
    setEnableTDS,
    copied,
    gstHistory,
    gstResults,
    effectiveGstRate,
    handleSaveToHistory,
    handleCopyBreakdown,
    addAmountPreset,
  };
}
