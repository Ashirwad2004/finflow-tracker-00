import React from "react";
import { Monitor, Printer, Smartphone } from "lucide-react";
import { DeviceTab } from "./types";

interface HeroDeviceSwitcherProps {
  deviceTab: DeviceTab;
  onTabChange: (tab: DeviceTab) => void;
  onCompareClick: () => void;
}

export const HeroDeviceSwitcher: React.FC<HeroDeviceSwitcherProps> = ({
  deviceTab,
  onTabChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Live Software View:
        </span>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          ● Live Counter Terminal (Active)
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="inline-flex p-1 rounded-xl bg-muted border border-border text-xs">
          <button
            onClick={() => onTabChange("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              deviceTab === "dashboard"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-primary" />
            <span>Business Dashboard (Pro)</span>
          </button>
          <button
            onClick={() => onTabChange("pos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              deviceTab === "pos"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-amber-500" />
            <span>Retail POS Counter</span>
          </button>
          <button
            onClick={() => onTabChange("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              deviceTab === "mobile"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>WhatsApp Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const HeroHardwareStrip: React.FC<{ onCompareClick: () => void }> = ({
  onCompareClick,
}) => {
  return (
    <div className="mt-4 p-4 rounded-xl bg-card border border-border/70 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">Hardware &amp; Printer Ready:</span>
        <span>2" &amp; 3" Thermal Printers (Epson, TVS, NGX, Everycom)</span>
        <span className="text-border">•</span>
        <span>USB / Bluetooth Barcode Scanners</span>
      </div>
      <div className="flex items-center gap-3 font-semibold text-primary">
        <span className="cursor-pointer hover:underline" onClick={onCompareClick}>
          Compare with Vyapar &amp; Excel →
        </span>
      </div>
    </div>
  );
};
