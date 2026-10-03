export interface IFSCDetails {
  bank: string;
  branch: string;
  city: string;
  state: string;
  ifsc: string;
  bankCode?: string;
  upi?: boolean;
  neft?: boolean;
  rtgs?: boolean;
  imps?: boolean;
}

export interface RazorpayIFSCResponse {
  BANK?: unknown;
  IFSC?: unknown;
  BRANCH?: unknown;
  CITY?: unknown;
  DISTRICT?: unknown;
  STATE?: unknown;
  BANKCODE?: unknown;
  UPI?: unknown;
  NEFT?: unknown;
  RTGS?: unknown;
  IMPS?: unknown;
}

export interface CacheEntry {
  value: IFSCDetails | null;
  expiresAt: number;
}

export interface Logger {
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Default logger — writes to console. */
export const defaultLogger: Logger = {
  warn: (message, meta) => {
    // eslint-disable-next-line no-console
    console.warn(message, meta ?? "");
  },
  error: (message, meta) => {
    // eslint-disable-next-line no-console
    console.error(message, meta ?? "");
  },
};

/** Silences all logging. */
export const noopLogger: Logger = {
  warn: () => undefined,
  error: () => undefined,
};

export interface IFSCServiceOptions {
  baseUrl?: string;
  timeoutMs?: number;
  successTtlMs?: number;
  negativeTtlMs?: number;
  maxCacheEntries?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  logger?: Logger;
}

export const DEFAULTS = {
  baseUrl: "https://ifsc.razorpay.com",
  timeoutMs: 5_000,
  successTtlMs: 24 * 60 * 60 * 1000,
  negativeTtlMs: 5 * 60 * 1000,
  maxCacheEntries: 5_000,
  maxRetries: 1,
  retryDelayMs: 250,
} as const;
