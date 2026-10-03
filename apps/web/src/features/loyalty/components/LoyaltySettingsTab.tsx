import React from "react";
import { Button } from "@/components/ui/button";
import { Settings2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { LoyaltyConfig } from "../types";

interface LoyaltySettingsTabProps {
  config: LoyaltyConfig;
  setConfig: React.Dispatch<React.SetStateAction<LoyaltyConfig>>;
  ledgerUnavailable: boolean;
  formatCurrency: (amount: number) => string;
}

export function LoyaltySettingsTab({
  config,
  setConfig,
  ledgerUnavailable,
  formatCurrency,
}: LoyaltySettingsTabProps) {
  return (
    <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
          <Settings2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-semibold">Reward Program Configuration</h3>
          <p className="text-[10px] text-slate-500">Define how customers earn and redeem points in your store.</p>
        </div>
      </div>

      {ledgerUnavailable && (
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
            Running on local, per-device point adjustments. Apply the <code className="font-mono">loyalty_ledger.sql</code> migration to sync
            adjustments across devices and keep a full audit trail.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border">
          <div className="space-y-0.5">
            <label className="font-semibold text-[11px] text-foreground">Enable Loyalty Points</label>
            <p className="text-[10px] text-slate-500">Allow customers to accumulate reward points on transactions.</p>
          </div>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            className="w-9 h-5 bg-slate-200 rounded-full appearance-none cursor-pointer checked:bg-primary relative before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-all checked:before:translate-x-4"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Point Earning Multiplier</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 mb-1.5">Award 1 point for every spent currency unit:</p>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={config.pointsPerUnit}
                disabled={!config.enabled}
                onChange={(e) => setConfig({ ...config, pointsPerUnit: Number(e.target.value) })}
                className="w-full accent-primary disabled:opacity-50"
              />
            </div>
            <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
              {formatCurrency(config.pointsPerUnit)}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Point Value (Exchange Rate)</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 mb-1.5">Monetary value of 1 reward point when redeeming:</p>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={config.pointValue}
                disabled={!config.enabled}
                onChange={(e) => setConfig({ ...config, pointValue: Number(e.target.value) })}
                className="w-full accent-primary disabled:opacity-50"
              />
            </div>
            <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
              {formatCurrency(config.pointValue)}/pt
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">VIP Gold Spend Threshold</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 mb-1.5">Total spend requirement for VIP membership perks:</p>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={config.vipThreshold}
                disabled={!config.enabled}
                onChange={(e) => setConfig({ ...config, vipThreshold: Number(e.target.value) })}
                className="w-full accent-primary disabled:opacity-50"
              />
            </div>
            <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
              {formatCurrency(config.vipThreshold)}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Points Expiry</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 mb-1.5">Days before unused points expire (0 = never):</p>
              <input
                type="range"
                min="0"
                max="730"
                step="30"
                value={config.pointsExpiryDays}
                disabled={!config.enabled}
                onChange={(e) => setConfig({ ...config, pointsExpiryDays: Number(e.target.value) })}
                className="w-full accent-primary disabled:opacity-50"
              />
            </div>
            <div className="w-24 text-center p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-[11px] font-semibold">
              {config.pointsExpiryDays === 0 ? "Never" : `${config.pointsExpiryDays}d`}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <Button
          size="sm"
          onClick={() => toast.success("Loyalty settings updated successfully!")}
          className="rounded-lg shadow-sm text-[11px] h-8"
        >
          Save Rule Configurations
        </Button>
      </div>
    </div>
  );
}
