import React from "react";
import { MessageCircle } from "lucide-react";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface WorkflowSettingsSectionProps {
  settings: SalesSettings;
  updateSetting: <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => void;
}

export const WorkflowSettingsSection: React.FC<WorkflowSettingsSectionProps> = ({
  settings,
  updateSetting,
}) => {
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-3">
        Workflow
      </p>

      {/* Warn on Outstanding Balance */}
      <div
        className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
          settings.warnOnOutstandingBalance
            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Warn on Outstanding Balance
            </p>
            {settings.warnOnOutstandingBalance && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Show a warning before creating a new invoice if the customer already has unpaid or
            overdue invoices.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.warnOnOutstandingBalance}
          onClick={() =>
            updateSetting("warnOnOutstandingBalance", !settings.warnOnOutstandingBalance)
          }
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 ${
            settings.warnOnOutstandingBalance
              ? "border-rose-500 bg-rose-500"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.warnOnOutstandingBalance ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Confirm Before Delete */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Confirm Before Delete
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Show a confirmation dialog before permanently deleting an invoice.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.confirmBeforeDelete}
          onClick={() => updateSetting("confirmBeforeDelete", !settings.confirmBeforeDelete)}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.confirmBeforeDelete
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.confirmBeforeDelete ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Enable Product HSN Codes */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Enable HSN Codes
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Display and manage HSN codes for products and items on invoices.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enableHsnCode}
          onClick={() => updateSetting("enableHsnCode", !settings.enableHsnCode)}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.enableHsnCode
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.enableHsnCode ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Enable Quick Billing Mode */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
            Default to Quick Invoicing
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simplify invoice creation by showing only essential fields (Customer, Product, Amount)
            by default.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enableQuickBilling}
          onClick={() => updateSetting("enableQuickBilling", !settings.enableQuickBilling)}
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            settings.enableQuickBilling
              ? "border-primary bg-primary"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.enableQuickBilling ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Auto-send Invoice via WhatsApp */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              Auto-send Invoice via WhatsApp
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically dispatch invoice summary and PDF via WhatsApp in background upon saving
            when customer phone is present. Zero extra clicks.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.autoSendWhatsAppOnInvoice}
          onClick={() =>
            updateSetting("autoSendWhatsAppOnInvoice", !settings.autoSendWhatsAppOnInvoice)
          }
          className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            settings.autoSendWhatsAppOnInvoice
              ? "border-emerald-600 bg-emerald-600"
              : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              settings.autoSendWhatsAppOnInvoice ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </>
  );
};
