import { IFSCDetails, Logger, RazorpayIFSCResponse } from "./types";

/**
 * Normalize IFSC input.
 * Example: " hdfc0001234 " -> "HDFC0001234"
 */
export function normalizeIFSC(ifsc: string): string {
  return ifsc.trim().toUpperCase();
}

/**
 * Validate standard Indian IFSC format.
 * Format:
 * - First 4 characters: A-Z
 * - Fifth character: 0
 * - Last 6 characters: A-Z / 0-9
 * Total length: 11 characters.
 */
export function isValidIFSC(ifsc: string): boolean {
  if (typeof ifsc !== "string") {
    return false;
  }

  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizeIFSC(ifsc));
}

/** Safely convert unknown API values into strings. */
export function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Safely convert optional API values to booleans.
 */
export function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "yes" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "no" || normalized === "0") {
      return false;
    }
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return undefined;
}

/**
 * Runtime validation of the external API response.
 */
export function isRazorpayIFSCResponse(value: unknown): value is RazorpayIFSCResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return typeof data.BANK === "string" && typeof data.IFSC === "string";
}

/** Convert external API data into our application model. */
export function mapIFSCResponse(
  data: RazorpayIFSCResponse,
  requestedIFSC: string,
  logger: Logger
): IFSCDetails | null {
  const bank = toStringValue(data.BANK);
  const returnedIFSC = toStringValue(data.IFSC).toUpperCase();

  if (!bank || !returnedIFSC) {
    return null;
  }

  if (returnedIFSC !== requestedIFSC) {
    logger.warn("[IFSC] API returned unexpected IFSC", {
      requested: requestedIFSC,
      returned: returnedIFSC,
    });
    return null;
  }

  const branch = toStringValue(data.BRANCH);
  const city = toStringValue(data.CITY) || toStringValue(data.DISTRICT);
  const state = toStringValue(data.STATE);
  const bankCode = toStringValue(data.BANKCODE);

  const details: IFSCDetails = {
    bank,
    branch,
    city,
    state,
    ifsc: requestedIFSC,
  };

  if (bankCode) {
    details.bankCode = bankCode;
  }

  const upi = toOptionalBoolean(data.UPI);
  const neft = toOptionalBoolean(data.NEFT);
  const rtgs = toOptionalBoolean(data.RTGS);
  const imps = toOptionalBoolean(data.IMPS);

  if (upi !== undefined) details.upi = upi;
  if (neft !== undefined) details.neft = neft;
  if (rtgs !== undefined) details.rtgs = rtgs;
  if (imps !== undefined) details.imps = imps;

  return details;
}
