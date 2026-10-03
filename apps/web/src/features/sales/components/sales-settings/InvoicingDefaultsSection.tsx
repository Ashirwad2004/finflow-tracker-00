import React from "react";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface InvoicingDefaultsSectionProps {
  settings: SalesSettings;
  updateSetting: <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => void;
}

export const InvoicingDefaultsSection: React.FC<InvoicingDefaultsSectionProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
        Invoicing Defaults
      </p>

      {/* Default Tax Rate */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Default Tax Rate
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pre-filled on every new invoice. Common GST slabs: 0, 5, 12, 18, 28%.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={settings.defaultTaxRate}
            onChange={(e) =>
              updateSetting("defaultTaxRate", Math.min(100, Math.max(0, Number(e.target.value))))
            }
            className="w-16 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-slate-500">%</span>
        </div>
      </div>

      {/* Item-Wise Tax Setting */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Item-Wise Tax</p>
            {settings.enableItemWiseTax && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Specify individual tax rates per line item (e.g. 5%, 12%, 18%, 28%) on each invoice
            instead of a single global tax rate.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enableItemWiseTax}
          onClick={() => updateSetting("enableItemWiseTax", !settings.enableItemWiseTax)}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.enableItemWiseTax
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.enableItemWiseTax ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Show Product Tax % on Bill */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Product Tax % on Bill
            </p>
            {settings.showItemTaxRateOnBill && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Display individual product tax / GST percentage (e.g. 5%, 12%, 18%) as a column on
            bills, invoices, and print receipts. Turn off if you don't want tax rates on items.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.showItemTaxRateOnBill}
          onClick={() => {
            const nextVal = !settings.showItemTaxRateOnBill;
            updateSetting("showItemTaxRateOnBill", nextVal);
            if (nextVal && !settings.enableItemWiseTax) {
              updateSetting("enableItemWiseTax", true);
            }
          }}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.showItemTaxRateOnBill
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.showItemTaxRateOnBill ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Default Invoice Status */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Default Invoice Status
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The pre-selected status when opening the Create Invoice form.
          </p>
        </div>
        <select
          value={settings.defaultStatus}
          onChange={(e) => updateSetting("defaultStatus", e.target.value as any)}
          className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Invoice Number Prefix */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Invoice Number Prefix
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Prepended to every auto-generated invoice number.
            <br />
            e.g.{" "}
            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">INV-</span> →{" "}
            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">INV-42</span>
          </p>
        </div>
        <input
          type="text"
          maxLength={10}
          value={settings.invoiceNumberPrefix}
          onChange={(e) => updateSetting("invoiceNumberPrefix", e.target.value.toUpperCase())}
          placeholder="e.g. INV-"
          className="w-24 h-9 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Payment Terms */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Default Payment Terms
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Days from invoice date until payment is due. Set to 0 to disable due dates.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={365}
            value={settings.defaultPaymentTermsDays}
            onChange={(e) =>
              updateSetting("defaultPaymentTermsDays", Math.max(0, Number(e.target.value)))
            }
            className="w-16 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-slate-500">days</span>
        </div>
      </div>
    </>
  );
};
