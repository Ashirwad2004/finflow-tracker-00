// ─── INDIAN GSTIN REGEX CHECK ──────────────────────────────────────────────────
// 2 digits state code + 5 chars PAN + 4 digits PAN + 1 char PAN + 1 entity code + 'Z' + 1 checksum
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
