import React from "react";
import { ShieldCheck, Scale } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GstViewPreference, GstPeriod } from "./types";
import { INDIAN_GST_STATES } from "./constants";

interface GstSwitcherToolbarProps {
  activeTab: GstViewPreference;
  onTabChange: (tab: GstViewPreference) => void;
  bizGSTIN: string;
  effectiveStateCode: string;
  onStateCodeChange: (code: string) => void;
  periods: GstPeriod[];
  selectedPeriodIndex: number;
  onPeriodIndexChange: (idx: number) => void;
}

export const GstSwitcherToolbar: React.FC<GstSwitcherToolbarProps> = ({
  activeTab,
  onTabChange,
  bizGSTIN,
  effectiveStateCode,
  onStateCodeChange,
  periods,
  selectedPeriodIndex,
  onPeriodIndexChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-xl p-2 shadow-xs">
      {/* Segmented Control for Returns */}
      <div className="bg-muted/70 p-1 rounded-lg border flex flex-wrap sm:flex-nowrap gap-1">
        <button
          type="button"
          onClick={() => onTabChange("gstr1")}
          className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "gstr1"
              ? "bg-orange-500 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GSTR-1</span>
          <span className="text-[10px] opacity-85 hidden md:inline">(Sales)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("gstr2b")}
          className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "gstr2b"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GSTR-2B</span>
          <span className="text-[10px] opacity-85 hidden md:inline">(ITC Purchases)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("gstr3b")}
          className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "gstr3b"
              ? "bg-violet-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>GSTR-3B</span>
          <span className="text-[10px] opacity-85 hidden md:inline">(Summary)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("reconciliation")}
          className={`py-1.5 px-3.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === "reconciliation"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>CA Reconciliation</span>
        </button>
      </div>

      {/* Right controls: Fallback state selector & Period (for Reconciliation) */}
      <div className="flex items-center gap-2 self-end sm:self-auto px-1">
        {!bizGSTIN ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>State:</span>
            <Select value={effectiveStateCode} onValueChange={onStateCodeChange}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="Select State" />
              </SelectTrigger>
              <SelectContent className="max-h-60 text-xs">
                {INDIAN_GST_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    {s.code} - {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-muted-foreground hidden lg:inline">
            GSTIN: {bizGSTIN}
          </span>
        )}

        {activeTab === "reconciliation" && (
          <Select
            value={selectedPeriodIndex.toString()}
            onValueChange={(val) => onPeriodIndexChange(Number(val))}
          >
            <SelectTrigger className="h-7 min-w-[170px] text-xs font-medium">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              {periods.map((p, idx) => (
                <SelectItem key={idx} value={idx.toString()} className="text-xs">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
};
