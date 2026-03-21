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
};

function getStorageKey(userId: string | undefined) {
  return userId ? `sales_settings_${userId}` : null;
}

function loadSettings(userId: string | undefined): SalesSettings {
  const key = getStorageKey(userId);
  if (!key) return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(userId: string | undefined, settings: SalesSettings) {
  const key = getStorageKey(userId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(settings));
}

export function useSalesSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<SalesSettings>(() => loadSettings(userId));

  useEffect(() => {
    setSettings(loadSettings(userId));
  }, [userId]);

  const updateSetting = useCallback(
    <K extends keyof SalesSettings>(key: K, value: SalesSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        saveSettings(userId, next);
        return next;
      });
    },
    [userId]
  );

  const resetSettings = useCallback(() => {
    saveSettings(userId, { ...DEFAULTS });
    setSettings({ ...DEFAULTS });
  }, [userId]);

  return { settings, updateSetting, resetSettings };
}
