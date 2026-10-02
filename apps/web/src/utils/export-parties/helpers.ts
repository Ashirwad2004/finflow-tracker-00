export const parseSafeDate = (d: any): Date => {
    if (!d) return new Date();
    if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
    if (typeof d === "string") {
        const s = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, day] = s.split("-").map(Number);
            return new Date(y, m - 1, day, 12, 0, 0);
        }
        if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(s)) {
            const [day, m, y] = s.split(/[-/]/).map(Number);
            return new Date(y, m - 1, day, 12, 0, 0);
        }
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date() : dt;
};

export const sanitizeText = (text: string | null | undefined): string => {
    if (!text) return "";
    return text.replace(/[^\x00-\x7F]/g, "").trim();
};

export const formatCurrencyNumber = (num: number): string => {
    return (num || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
