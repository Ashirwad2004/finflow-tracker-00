/**
 * useItemSettings
 *
 * A lightweight hook that persists item-level business settings to localStorage
 * keyed by the authenticated user's ID. This avoids any DB schema changes.
 *
 * Usage:
 *   const { settings, updateSetting } = useItemSettings(userId);
 *   settings.stopSaleOnNegativeStock  // boolean
 */

import { useState, useEffect, useCallback } from "react";

export interface ItemSettings {
  /** Block invoice creation when an item's quantity sold would exceed current stock. */
  stopSaleOnNegativeStock: boolean;
  /** Warn but still allow sales when stock falls below this threshold. 0 = disabled. */
  lowStockWarningThreshold: number;
  /** Automatically deduct stock when an invoice is marked as Paid (vs always). */
  deductStockOnlyOnPaid: boolean;
  /** Show stock quantity in the invoice item picker dropdown. */
  showStockInItemPicker: boolean;
}

const DEFAULTS: ItemSettings = {
  stopSaleOnNegativeStock: false,
  lowStockWarningThreshold: 10,
  deductStockOnlyOnPaid: false,
  showStockInItemPicker: true,
};

function getStorageKey(userId: string | undefined) {
  return userId ? `item_settings_${userId}` : null;
}

function loadSettings(userId: string | undefined): ItemSettings {
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

function saveSettings(userId: string | undefined, settings: ItemSettings) {
  const key = getStorageKey(userId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(settings));
}

export function useItemSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<ItemSettings>(() => loadSettings(userId));

  // Re-load if userId changes (e.g. after login)
  useEffect(() => {
    setSettings(loadSettings(userId));
  }, [userId]);

  const updateSetting = useCallback(
    <K extends keyof ItemSettings>(key: K, value: ItemSettings[K]) => {
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
