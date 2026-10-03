export function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

export function isValidPhone(phone?: string | null): boolean {
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) {
    return ["6", "7", "8", "9"].includes(digits[0]);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return ["6", "7", "8", "9"].includes(digits[2]);
  }
  return digits.length >= 10 && digits.length <= 15;
}
