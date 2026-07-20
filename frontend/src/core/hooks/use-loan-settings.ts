import { useState, useEffect, useCallback } from "react";

export interface LoanSettings {
  /** Number of days from loan creation before it is due. 0 = no default due date. */
  defaultDueDateDays: number;
}

const DEFAULTS: LoanSettings = {
  defaultDueDateDays: 0,
};

function getStorageKey(userId: string | undefined) {
  return userId ? `loan_settings_${userId}` : null;
}

function loadSettings(userId: string | undefined): LoanSettings {
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

function saveSettings(userId: string | undefined, settings: LoanSettings) {
  const key = getStorageKey(userId);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(settings));
}

export function useLoanSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<LoanSettings>(() => loadSettings(userId));

  useEffect(() => {
    setSettings(loadSettings(userId));
  }, [userId]);

  const updateSetting = useCallback(
    <K extends keyof LoanSettings>(key: K, value: LoanSettings[K]) => {
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
