import React from "react";
import { useGstStudioCalculator } from "./useGstStudioCalculator";
import { GstModeAndAmountCard } from "./GstModeAndAmountCard";
import { GstSlabsSelector } from "./GstSlabsSelector";
import { GstClausesCard } from "./GstClausesCard";
import { GstStatutoryBreakdownCard } from "./GstStatutoryBreakdownCard";
import { GstRecentHistory } from "./GstRecentHistory";

export const GstStudioTab: React.FC = () => {
  const {
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
    handleSaveToHistory,
    handleCopyBreakdown,
    addAmountPreset,
  } = useGstStudioCalculator();

  return (
    <div className="space-y-4 mt-3">
      <GstModeAndAmountCard
        calcType={calcType}
        onCalcTypeChange={setCalcType}
        amountStr={amountStr}
        onAmountChange={setAmountStr}
        onAddPreset={addAmountPreset}
        onClear={() => setAmountStr("0")}
      />

      <GstSlabsSelector
        gstRate={gstRate}
        onGstRateChange={(rate) => {
          setGstRate(rate);
          setIsCustomRate(false);
        }}
        isCustomRate={isCustomRate}
        onToggleCustomRate={() => setIsCustomRate(!isCustomRate)}
        customRateStr={customRateStr}
        onCustomRateChange={setCustomRateStr}
      />

      <GstClausesCard
        supplyType={supplyType}
        onSupplyTypeChange={setSupplyType}
        cessRateStr={cessRateStr}
        onCessRateChange={setCessRateStr}
        isRCM={isRCM}
        onToggleRCM={setIsRCM}
        enableTDS={enableTDS}
        onToggleTDS={setEnableTDS}
      />

      <GstStatutoryBreakdownCard
        gstResults={gstResults}
        supplyType={supplyType}
        enableTDS={enableTDS}
        isRCM={isRCM}
        copied={copied}
        onCopyBreakdown={handleCopyBreakdown}
        onSaveToHistory={handleSaveToHistory}
      />

      <GstRecentHistory
        gstHistory={gstHistory}
        onSelectHistoryItem={(amount, rate, type) => {
          setAmountStr(String(amount));
          setGstRate(rate);
          setCalcType(type);
        }}
      />
    </div>
  );
};

export default GstStudioTab;
export * from "./types";
export * from "./useGstStudioCalculator";
