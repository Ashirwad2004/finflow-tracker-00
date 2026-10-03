import React from "react";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface AccountingControlsSectionProps {
  settings: SalesSettings;
  updateSetting: <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => void;
}

export const AccountingControlsSection: React.FC<AccountingControlsSectionProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-3">
        Accounting Controls
      </p>

      {/* Prevent Backdating */}
      <div
        className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
          settings.preventBackdating
            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Prevent Backdating
            </p>
            {settings.preventBackdating && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Block invoices dated more than{" "}
            <span className="font-semibold">{settings.backdatingLimitDays} days</span> in the
            past. Protects closed accounting periods.
          </p>
          {settings.preventBackdating && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">Limit:</span>
              <input
                type="number"
                min={1}
                max={365}
                value={settings.backdatingLimitDays}
                onChange={(e) =>
                  updateSetting("backdatingLimitDays", Math.max(1, Number(e.target.value)))
                }
                className="w-16 h-7 text-right text-sm font-bold rounded-lg border border-amber-300 bg-white dark:bg-amber-950/20 px-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-xs text-slate-500">days</span>
            </div>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.preventBackdating}
          onClick={() => updateSetting("preventBackdating", !settings.preventBackdating)}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${
            settings.preventBackdating
              ? "border-amber-500 bg-amber-500"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.preventBackdating ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Round Off Total */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Round Off Invoice Total
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rounds the final payable amount to the nearest rupee. The round-off difference is
            shown as a separate line item on the invoice — standard CA practice.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.roundOffTotal}
          onClick={() => updateSetting("roundOffTotal", !settings.roundOffTotal)}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.roundOffTotal
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.roundOffTotal ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* GST Mode */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            GST Display Mode
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            How tax is labelled on invoices.
            <br />
            <span className="font-semibold">IGST</span> = inter-state &bull;{" "}
            <span className="font-semibold">CGST+SGST</span> = intra-state
          </p>
        </div>
        <select
          value={settings.gstMode}
          onChange={(e) => updateSetting("gstMode", e.target.value as any)}
          className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="none">Generic Tax</option>
          <option value="igst">IGST</option>
          <option value="cgst_sgst">CGST + SGST</option>
        </select>
      </div>

      {/* Show Party Pending Balance on Invoices */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Show Party Pending Balance
            </p>
            {settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance ? (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                ON
              </span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                OFF
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            When creating, viewing, or printing an invoice, show the customer&apos;s /
            party&apos;s current total pending balance on the invoice.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance}
          onClick={() =>
            updateSetting(
              "showPartyPendingBalance",
              !(settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance)
            )
          }
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance
                ? "translate-x-5"
                : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </>
  );
};
