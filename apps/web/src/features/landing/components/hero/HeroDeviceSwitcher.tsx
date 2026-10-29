import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Monitor, Printer, Smartphone, ArrowUpRight } from "lucide-react";
import { EASE_DRAW, useTabKeys } from "@/features/landing/motion";
import { DeviceTab } from "./types";

interface HeroDeviceSwitcherProps {
  deviceTab: DeviceTab;
  onTabChange: (tab: DeviceTab) => void;
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
  const reduced = useReducedMotion();
  const { tabProps } = useTabKeys(
    DEVICE_TABS.map((t) => t.id),
    deviceTab,
    onTabChange
  );

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* A live indicator reads as a running product, not a marketing badge.
          The dot has a slow pulse ring behind it, which is the one place on the
          page a loop is allowed purely to mean "this is live". */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          {!reduced && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[hsl(var(--lp-green))]"
              animate={{ scale: [1, 2.4, 2.4], opacity: [0.55, 0, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <span className="relative h-2 w-2 rounded-full bg-[hsl(var(--lp-green))]" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          This is the running product, not a screenshot
        </span>
      </div>

      {/*
        Segmented control. The selected tab used to be filled with
        `bg-background`, which worked when this sat on paper — on the hero's
        dark stage that is the darkest colour available, so the selected tab
        became the least visible one. It is now a raised translucent block in
        the page's own ink, which reads correctly on either ground.

        The block slides between tabs rather than fading: a tab switch is
        motion answering a click, so it should show what moved.
      */}
      <div
        role="tablist"
        aria-label="Choose a product view"
        className="flex items-center gap-1 self-start border border-[hsl(var(--lp-rule-strong))] bg-[hsl(var(--lp-ink)/0.04)] p-1 sm:self-auto"
      >
        {DEVICE_TABS.map((tab) => {
          const active = deviceTab === tab.id;
          return (
            <button
              key={tab.id}
              {...tabProps(tab.id)}
              id={`lp-device-tab-${tab.id}`}
              aria-controls="lp-device-panel"
              className={`group relative isolate flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs ${
                active
                  ? "text-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  aria-hidden="true"
                  layoutId={reduced ? undefined : "lp-device-tab"}
                  className="absolute inset-0 -z-10 rounded-lg border border-[hsl(var(--lp-rule-strong))] bg-[hsl(var(--lp-ink)/0.12)] shadow-sm"
                  transition={{ duration: 0.38, ease: EASE_DRAW }}
                />
              )}
              <tab.icon
                className={`h-3.5 w-3.5 ${
                  active ? "text-[hsl(var(--lp-brass))]" : ""
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
  const reduced = useReducedMotion();

  return (
    /* The hero's closing line. It sat still while everything above it was on a
       load timeline, so it read as chrome rather than as the last beat. */
    <motion.div
      className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[hsl(var(--lp-rule))] pt-5 text-xs text-muted-foreground"
      initial={reduced ? undefined : { opacity: 0, y: 12 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.55, ease: EASE_DRAW, delay: 0.1 }}
    >
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
    </motion.div>
  );
};
