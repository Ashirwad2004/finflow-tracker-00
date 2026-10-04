import React from "react";
import { Monitor, Printer, Smartphone, ArrowUpRight } from "lucide-react";
import { DeviceTab } from "./types";

interface HeroDeviceSwitcherProps {
  deviceTab: DeviceTab;
  onTabChange: (tab: DeviceTab) => void;
  onCompareClick: () => void;
}

const DEVICE_TABS: {
  id: DeviceTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "dashboard", label: "Business dashboard", icon: Monitor },
  { id: "pos", label: "Counter POS", icon: Printer },
  { id: "mobile", label: "Customer WhatsApp", icon: Smartphone },
];

export const HeroDeviceSwitcher: React.FC<HeroDeviceSwitcherProps> = ({
  deviceTab,
  onTabChange,
}) => {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* A live indicator reads as a running product, not a marketing badge. */}
      <div className="flex items-center gap-2.5">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--lp-green))]" />
        <span className="text-xs font-medium text-muted-foreground">
          This is the running product, not a screenshot
        </span>
      </div>

      {/* Segmented control, underline-style. Tabs on a device frame, not buttons. */}
      <div
        role="tablist"
        aria-label="Choose a product view"
        className="flex items-center gap-1 self-start border border-[hsl(var(--lp-rule-strong))] bg-muted/50 p-1 sm:self-auto"
      >
        {DEVICE_TABS.map((tab) => {
          const active = deviceTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all sm:px-3 sm:text-xs ${
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-[hsl(var(--lp-rule))]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon
                className={`h-3.5 w-3.5 ${
                  active ? "text-[hsl(var(--lp-red))]" : ""
                }`}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const HeroHardwareStrip: React.FC<{ onCompareClick: () => void }> = ({
  onCompareClick,
}) => {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[hsl(var(--lp-rule))] pt-5 text-xs text-muted-foreground">
      <p className="max-w-xl leading-relaxed">
        Works with the hardware already on your counter: 2&quot; and 3&quot;
        thermal printers from Epson, TVS, NGX and Everycom, plus USB and
        Bluetooth barcode scanners.
      </p>

      <button
        onClick={onCompareClick}
        className="lp-link inline-flex items-center gap-1 font-semibold text-foreground"
      >
        Compare with paper khata and Excel
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
