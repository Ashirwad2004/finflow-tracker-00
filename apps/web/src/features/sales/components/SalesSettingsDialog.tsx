import React from "react";
import { Settings2, MessageCircle, Info } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SalesSettings } from "@/core/hooks/use-sales-settings";

interface SalesSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    settings: SalesSettings;
    updateSetting: <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => void;
    resetSettings: () => void;
}

export const SalesSettingsDialog: React.FC<SalesSettingsDialogProps> = ({
    open,
    onOpenChange,
    settings,
    updateSetting,
    resetSettings,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-primary" />
                        Sales Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure invoicing defaults, accounting controls, and workflow preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-1 py-2">
                    {/* ── INVOICING DEFAULTS ── */}
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Invoicing Defaults</p>

                    {/* Default Tax Rate */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default Tax Rate</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Pre-filled on every new invoice. Common GST slabs: 0, 5, 12, 18, 28%.</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={settings.defaultTaxRate}
                                onChange={(e) => updateSetting("defaultTaxRate", Math.min(100, Math.max(0, Number(e.target.value))))}
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
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20">Active</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Specify individual tax rates per line item (e.g. 5%, 12%, 18%, 28%) on each invoice instead of a single global tax rate.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.enableItemWiseTax}
                            onClick={() => updateSetting("enableItemWiseTax", !settings.enableItemWiseTax)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.enableItemWiseTax ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enableItemWiseTax ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Show Product Tax % on Bill */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Product Tax % on Bill</p>
                                {settings.showItemTaxRateOnBill && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">Active</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Display individual product tax / GST percentage (e.g. 5%, 12%, 18%) as a column on bills, invoices, and print receipts. Turn off if you don't want tax rates on items.
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
                                settings.showItemTaxRateOnBill ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.showItemTaxRateOnBill ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Default Invoice Status */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default Invoice Status</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">The pre-selected status when opening the Create Invoice form.</p>
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
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Invoice Number Prefix</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Prepended to every auto-generated invoice number.<br/>
                                e.g. <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">INV-</span> → <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">INV-42</span>
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
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default Payment Terms</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Days from invoice date until payment is due. Set to 0 to disable due dates.</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={0}
                                max={365}
                                value={settings.defaultPaymentTermsDays}
                                onChange={(e) => updateSetting("defaultPaymentTermsDays", Math.max(0, Number(e.target.value)))}
                                className="w-16 h-9 text-right text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-slate-500">days</span>
                        </div>
                    </div>

                    {/* ── ACCOUNTING CONTROLS ── */}
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-3">Accounting Controls</p>

                    {/* Prevent Backdating */}
                    <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
                        settings.preventBackdating
                            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Prevent Backdating</p>
                                {settings.preventBackdating && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700">Active</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Block invoices dated more than <span className="font-semibold">{settings.backdatingLimitDays} days</span> in the past. Protects closed accounting periods.
                            </p>
                            {settings.preventBackdating && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-slate-500">Limit:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={settings.backdatingLimitDays}
                                        onChange={(e) => updateSetting("backdatingLimitDays", Math.max(1, Number(e.target.value)))}
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
                                settings.preventBackdating ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.preventBackdating ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Round Off Total */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Round Off Invoice Total</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Rounds the final payable amount to the nearest rupee. The round-off difference is shown as a separate line item on the invoice — standard CA practice.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.roundOffTotal}
                            onClick={() => updateSetting("roundOffTotal", !settings.roundOffTotal)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.roundOffTotal ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.roundOffTotal ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* GST Mode */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">GST Display Mode</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                How tax is labelled on invoices.<br/>
                                <span className="font-semibold">IGST</span> = inter-state &bull; <span className="font-semibold">CGST+SGST</span> = intra-state
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
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Show Party Pending Balance</p>
                                {(settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance) ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">ON</span>
                                ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">OFF</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                When creating, viewing, or printing an invoice, show the customer&apos;s / party&apos;s current total pending balance on the invoice.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance}
                            onClick={() => updateSetting("showPartyPendingBalance", !(settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance))}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                (settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance) ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${(settings.showPartyPendingBalance ?? settings.showPartyPreviousBalance) ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* ── WORKFLOW ── */}
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-3">Workflow</p>

                    {/* Warn on Outstanding Balance */}
                    <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
                        settings.warnOnOutstandingBalance
                            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Warn on Outstanding Balance</p>
                                {settings.warnOnOutstandingBalance && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-700">Active</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Show a warning before creating a new invoice if the customer already has unpaid or overdue invoices.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.warnOnOutstandingBalance}
                            onClick={() => updateSetting("warnOnOutstandingBalance", !settings.warnOnOutstandingBalance)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 ${
                                settings.warnOnOutstandingBalance ? "border-rose-500 bg-rose-500" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.warnOnOutstandingBalance ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Confirm Before Delete */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Confirm Before Delete</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Show a confirmation dialog before permanently deleting an invoice.</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.confirmBeforeDelete}
                            onClick={() => updateSetting("confirmBeforeDelete", !settings.confirmBeforeDelete)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.confirmBeforeDelete ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.confirmBeforeDelete ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Enable Product HSN Codes */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Enable HSN Codes</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Display and manage HSN codes for products and items on invoices.</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.enableHsnCode}
                            onClick={() => updateSetting("enableHsnCode", !settings.enableHsnCode)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.enableHsnCode ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enableHsnCode ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Enable Quick Billing Mode */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">Default to Quick Invoicing</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Simplify invoice creation by showing only essential fields (Customer, Product, Amount) by default.</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.enableQuickBilling}
                            onClick={() => updateSetting("enableQuickBilling", !settings.enableQuickBilling)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                settings.enableQuickBilling ? "border-primary bg-primary" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.enableQuickBilling ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Auto-send Invoice via WhatsApp */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 mt-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                                <MessageCircle className="w-4 h-4 text-emerald-600" />
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">Auto-send Invoice via WhatsApp</p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Automatically dispatch invoice summary and PDF via WhatsApp in background upon saving when customer phone is present. Zero extra clicks.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={settings.autoSendWhatsAppOnInvoice}
                            onClick={() => updateSetting("autoSendWhatsAppOnInvoice", !settings.autoSendWhatsAppOnInvoice)}
                            className={`relative flex-shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                                settings.autoSendWhatsAppOnInvoice ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
                            }`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${settings.autoSendWhatsAppOnInvoice ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    {/* Info note */}
                    <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                            All changes apply immediately. Defaults apply to new invoices only; existing invoices are unaffected.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="ghost" size="sm" onClick={resetSettings} className="text-slate-500 mr-auto">
                        Reset to Defaults
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
