/**
 * Global System-Wide Overdue Settings & Helper Utilities
 */

export const DEFAULT_OVERDUE_DAYS = 15;
export const OVERDUE_STORAGE_KEY = "finflow_overdue_threshold_days";

/**
 * Get system-wide overdue threshold in days (default: 15 days)
 */
export const getOverdueDaysThreshold = (): number => {
    const saved = localStorage.getItem(OVERDUE_STORAGE_KEY);
    if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return DEFAULT_OVERDUE_DAYS;
};

/**
 * Set system-wide overdue threshold in days
 */
export const setOverdueDaysThreshold = (days: number): void => {
    localStorage.setItem(OVERDUE_STORAGE_KEY, days.toString());
    window.dispatchEvent(new Event("finflow_overdue_settings_changed"));
};

/**
 * Check if a financial record (Purchase, Sale, Loan, Invoice) is overdue
 * based on explicit status or system-wide overdue days threshold.
 */
export const isRecordOverdue = (record: {
    status?: string;
    date?: string;
    due_date?: string;
}): boolean => {
    if (!record) return false;

    // If already settled, paid, or draft, it's not overdue
    if (record.status === "paid" || record.status === "draft" || record.status === "completed") {
        return false;
    }

    // Explicitly marked overdue
    if (record.status === "overdue") {
        return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If explicit due_date exists and is past today
    if (record.due_date) {
        const dueDate = new Date(record.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    }

    // Fallback to record date + system-wide overdue threshold
    if (record.date && record.status === "pending") {
        const thresholdDays = getOverdueDaysThreshold();
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - recordDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > thresholdDays;
    }

    return false;
};
