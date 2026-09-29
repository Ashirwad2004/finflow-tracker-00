/**
 * useSalesSettings
 *
 * CA-grade sales & invoicing settings persisted to localStorage per user.
 * Covers: default tax, payment terms, invoice numbering, backdate control,
 * rounding, GST mode, and duplicate-number warnings.
 *
 * Usage:
 *   const { settings, updateSetting, resetSettings } = useSalesSettings(userId);
 */

import { useState, useEffect, useCallback } from "react";

export type GstMode = "none" | "igst" | "cgst_sgst";
export type DefaultStatus = "paid" | "pending";

export interface SalesSettings {
  // ── Invoicing Defaults ────────────────────────────────────────────────────
  /** Pre-fill tax rate (%) on every new invoice. Matches GST slabs: 0,5,12,18,28. */
  defaultTaxRate: number;
  /** Default invoice status when creating a new invoice. */
  defaultStatus: DefaultStatus;
  /** Prefix applied to every auto-generated invoice number. e.g. "INV-" → "INV-42". */
  invoiceNumberPrefix: string;
  /** Number of days from invoice date before payment is due. 0 = no due date. */
  defaultPaymentTermsDays: number;

  // ── Accounting Controls (CA-grade) ────────────────────────────────────────
  /**
   * If true, invoices cannot be created/backdated beyond `backdatingLimitDays`
   * in the past. Protects the integrity of closed accounting periods.
   */
  preventBackdating: boolean;
  /** How many days back an invoice date can be set. Ignored if preventBackdating=false. */
  backdatingLimitDays: number;
  /**
   * Round off final invoice total to the nearest rupee (standard accounting practice).
   * The rounding difference is shown as a line item.
   */
  roundOffTotal: boolean;
  /**
   * GST display mode:
   * - none     → show single "Tax" line (generic)
   * - igst     → show IGST (inter-state supply)
   * - cgst_sgst → split into CGST + SGST (intra-state supply)
   */
  gstMode: GstMode;

  // ── Workflow ──────────────────────────────────────────────────────────────
  /** Warn if a customer has outstanding (unpaid/overdue) invoices before creating a new one. */
  warnOnOutstandingBalance: boolean;
  /** Show a confirmation dialog before deleting an invoice. */
  confirmBeforeDelete: boolean;
  /** Enable HSN code entry on products and invoices. */
  enableHsnCode: boolean;
  /** Default Terms & Conditions prefilled on new invoices. */
  defaultTermsAndConditions?: string;
  /** Default to Quick Invoicing mode in the Create Invoice Dialog. */
  enableQuickBilling: boolean;
  /** Enable item-wise tax allowing individual GST tax rates per line item. */
  enableItemWiseTax: boolean;
  /** Show individual product tax % column on bills and invoices. */
  showItemTaxRateOnBill: boolean;
  /**
   * Display customer's overall pending balance on bills, invoices, and prints.
   * Sales Settings → Show Party Pending Balance (ON / OFF)
   */
  showPartyPendingBalance: boolean;
  /**
   * Backward-compatible alias for showPartyPendingBalance.
   */
  showPartyPreviousBalance: boolean;
  /**
   * Automatically dispatch invoice notification & PDF to customer via WhatsApp upon saving.
   */
  autoSendWhatsAppOnInvoice: boolean;
}

const DEFAULTS: SalesSettings = {
  defaultTaxRate: 18,
  defaultStatus: "paid",
  invoiceNumberPrefix: "",
  defaultPaymentTermsDays: 0,
  preventBackdating: false,
  backdatingLimitDays: 90,
  roundOffTotal: false,
  gstMode: "none",
  warnOnOutstandingBalance: false,
  confirmBeforeDelete: true,
  enableHsnCode: false,
  defaultTermsAndConditions: "Thank you for your business. For any inquiries, please contact us.",
  enableQuickBilling: false,
  enableItemWiseTax: false,
  showItemTaxRateOnBill: false,
  showPartyPendingBalance: true,
  showPartyPreviousBalance: true,
  autoSendWhatsAppOnInvoice: false,
};

function getStorageKey(userId: string | undefined) {
  return userId ? `sales_settings_${userId}` : null;
}

function loadSettings(userId: string | undefined): SalesSettings {
  const key = getStorageKey(userId);
  const globalShowItemTax = localStorage.getItem("rupeebill_show_item_tax_rate_on_bill");
  const fallbackShowTax = globalShowItemTax !== null ? globalShowItemTax === "true" : DEFAULTS.showItemTaxRateOnBill;
  
  const globalShowPendingBal = localStorage.getItem("rupeebill_show_party_pending_balance");
  const globalShowPartyBal = globalShowPendingBal !== null ? globalShowPendingBal : localStorage.getItem("rupeebill_show_party_previous_balance");
  const fallbackShowPartyBal = globalShowPartyBal !== null ? globalShowPartyBal === "true" : DEFAULTS.showPartyPendingBalance;
  
  if (!key) return { ...DEFAULTS, showItemTaxRateOnBill: fallbackShowTax, showPartyPendingBalance: fallbackShowPartyBal, showPartyPreviousBalance: fallbackShowPartyBal };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULTS, showItemTaxRateOnBill: fallbackShowTax, showPartyPendingBalance: fallbackShowPartyBal, showPartyPreviousBalance: fallbackShowPartyBal };
    const parsed = JSON.parse(raw);
    const resolvedPartyBal = parsed.showPartyPendingBalance !== undefined 
      ? parsed.showPartyPendingBalance 
      : (parsed.showPartyPreviousBalance !== undefined ? parsed.showPartyPreviousBalance : fallbackShowPartyBal);

    return {
      ...DEFAULTS,
      ...parsed,
      showItemTaxRateOnBill: parsed.showItemTaxRateOnBill !== undefined ? parsed.showItemTaxRateOnBill : fallbackShowTax,
      showPartyPendingBalance: resolvedPartyBal,
      showPartyPreviousBalance: resolvedPartyBal,
      autoSendWhatsAppOnInvoice: parsed.autoSendWhatsAppOnInvoice !== undefined ? parsed.autoSendWhatsAppOnInvoice : DEFAULTS.autoSendWhatsAppOnInvoice,
    };
  } catch {
    return { ...DEFAULTS, showItemTaxRateOnBill: fallbackShowTax, showPartyPendingBalance: fallbackShowPartyBal, showPartyPreviousBalance: fallbackShowPartyBal };
  }
}

function saveSettings(userId: string | undefined, settings: SalesSettings) {
  const key = getStorageKey(userId);
  localStorage.setItem("rupeebill_show_item_tax_rate_on_bill", String(Boolean(settings.showItemTaxRateOnBill)));
  localStorage.setItem("rupeebill_show_party_pending_balance", String(Boolean(settings.showPartyPendingBalance)));
  localStorage.setItem("rupeebill_show_party_previous_balance", String(Boolean(settings.showPartyPendingBalance)));
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(settings));
}

import { apiClient } from "@/core/api/apiClient";

export function useSalesSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<SalesSettings>(() => loadSettings(userId));

  // Sync settings with server database (public.user_settings) for merchant store
  useEffect(() => {
    setSettings(loadSettings(userId));

    if (!userId) return;
    let isSubscribed = true;

    apiClient
      .get<{ show_party_pending_balance?: boolean; [key: string]: any }>("/api/v1/settings/sales")
      .then((res) => {
        if (!isSubscribed || !res.data) return;
        const serverData = res.data;
        if (serverData.show_party_pending_balance !== undefined) {
          const serverBal = Boolean(serverData.show_party_pending_balance);
          setSettings((prev) => {
            const updated: SalesSettings = {
              ...prev,
              ...serverData,
              showPartyPendingBalance: serverBal,
              showPartyPreviousBalance: serverBal,
            };
            saveSettings(userId, updated);
            return updated;
          });
        }
      })
      .catch((err) => {
        // Fall back gracefully to local settings if backend unreachable
        console.debug("Backend sales settings fetch skipped or unavailable:", err?.message || err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [userId]);

  const updateSetting = useCallback(
    <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        // Keep pending & previous in sync
        if (key === "showPartyPendingBalance") {
          next.showPartyPreviousBalance = Boolean(value);
        } else if (key === "showPartyPreviousBalance") {
          next.showPartyPendingBalance = Boolean(value);
        }

        saveSettings(userId, next);

        // Persist to server backend database asynchronously
        if (userId) {
          apiClient
            .patch("/api/v1/settings/sales", {
              ...next,
              show_party_pending_balance: next.showPartyPendingBalance,
              show_party_previous_balance: next.showPartyPendingBalance,
            })
            .catch((err) => {
              console.warn("Failed to persist sales setting to server:", err?.message || err);
            });
        }

        return next;
      });
    },
    [userId]
  );

  const resetSettings = useCallback(() => {
    saveSettings(userId, { ...DEFAULTS });
    setSettings({ ...DEFAULTS });
    if (userId) {
      apiClient
        .patch("/api/v1/settings/sales", {
          ...DEFAULTS,
          show_party_pending_balance: DEFAULTS.showPartyPendingBalance,
        })
        .catch(() => {});
    }
  }, [userId]);

  return { settings, updateSetting, resetSettings };
}