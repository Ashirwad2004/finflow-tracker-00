/**
 * Indian IFSC Lookup Service
 *
 * Purpose:
 * - Validate Indian IFSC codes
 * - Fetch bank and branch details
 * - Cache successful lookups
 * - Cache invalid/not-found results briefly
 * - Handle network failures, timeouts, and transient errors safely
 *
 * Data source:
 * Razorpay IFSC Toolkit
 *
 * IMPORTANT:
 * This service performs IFSC lookup only.
 * It does NOT verify whether a bank account actually exists.
 *
 * Production notes:
 * - The cache is process-local (in-memory). It is NOT shared across
 *   serverless/edge function instances, browser tabs, or server
 *   restarts. If cache-hit-rate matters at scale (many instances),
 *   front this with a shared cache (e.g. Redis) instead.
 * - Concurrent lookups for the same IFSC are deduplicated, so a burst
 *   of calls for the same code (e.g. re-renders, rapid typing) only
 *   triggers one network request.
 * - Transient failures (network errors, 5xx responses, timeouts) are
 *   retried with linear backoff. 404s and malformed responses are not
 *   retried — they are treated as definitive.
 * - Use createIFSCService() to inject a custom fetch implementation,
 *   base URL, or logger for unit tests and non-browser runtimes.
 */

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

interface RazorpayIFSCResponse {
    BANK?: unknown;
    IFSC?: unknown;
    BRANCH?: unknown;
    CITY?: unknown;
    DISTRICT?: unknown;
    STATE?: unknown;
    BANKCODE?: unknown;

    // These are optional because they are not guaranteed
    // by the IFSC Toolkit response.
    UPI?: unknown;
    NEFT?: unknown;
    RTGS?: unknown;
    IMPS?: unknown;
}

interface CacheEntry {
    value: IFSCDetails | null;
    expiresAt: number;
}

export interface Logger {
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
}

/** Default logger — writes to console. Swap for pino/winston/etc. in production. */
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

/** Silences all logging. Useful in tests or noise-sensitive environments. */
export const noopLogger: Logger = {
    warn: () => undefined,
    error: () => undefined,
};

export interface IFSCServiceOptions {
    /** Base URL of the IFSC lookup API. Defaults to Razorpay's public toolkit. */
    baseUrl?: string;
    /** Per-request timeout in ms. Default 5000. */
    timeoutMs?: number;
    /** How long successful lookups stay cached, in ms. Default 24h. */
    successTtlMs?: number;
    /** How long not-found results stay cached, in ms. Default 5m. */
    negativeTtlMs?: number;
    /** Max cache entries before the least-recently-used is evicted. Default 5000. */
    maxCacheEntries?: number;
    /** Retries for transient failures (network errors, timeouts, 5xx). Default 1. */
    maxRetries?: number;
    /** Base delay between retries, in ms (linear backoff: delay * attempt). Default 250. */
    retryDelayMs?: number;
    /** Custom fetch implementation — useful for tests or non-global-fetch runtimes. */
    fetchImpl?: typeof fetch;
    /** Custom logger. Pass `noopLogger` to silence warnings in production. */
    logger?: Logger;
}

const DEFAULTS = {
    baseUrl: "https://ifsc.razorpay.com",
    timeoutMs: 5_000,
    successTtlMs: 24 * 60 * 60 * 1000,
    negativeTtlMs: 5 * 60 * 1000,
    maxCacheEntries: 5_000,
    maxRetries: 1,
    retryDelayMs: 250,
} as const;

/**
 * Normalize IFSC input.
 *
 * Example:
 * " hdfc0001234 " -> "HDFC0001234"
 */
function normalizeIFSC(ifsc: string): string {
    return ifsc.trim().toUpperCase();
}

/**
 * Validate standard Indian IFSC format.
 *
 * Format:
 * - First 4 characters: A-Z
 * - Fifth character: 0
 * - Last 6 characters: A-Z / 0-9
 *
 * Total length: 11 characters.
 */
export function isValidIFSC(ifsc: string): boolean {
    if (typeof ifsc !== "string") {
        return false;
    }

    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizeIFSC(ifsc));
}

/** Safely convert unknown API values into strings. */
function toStringValue(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

/**
 * Safely convert optional API values to booleans.
 *
 * We do NOT blindly use Boolean(value), because:
 * Boolean("false") === true
 * which would be incorrect.
 */
function toOptionalBoolean(value: unknown): boolean | undefined {
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
 * We do not trust TypeScript types coming from an external API.
 */
function isRazorpayIFSCResponse(value: unknown): value is RazorpayIFSCResponse {
    if (!value || typeof value !== "object") {
        return false;
    }

    const data = value as Record<string, unknown>;

    return typeof data.BANK === "string" && typeof data.IFSC === "string";
}

/** Convert external API data into our application model. */
function mapIFSCResponse(
    data: RazorpayIFSCResponse,
    requestedIFSC: string,
    logger: Logger
): IFSCDetails | null {
    const bank = toStringValue(data.BANK);
    const returnedIFSC = toStringValue(data.IFSC).toUpperCase();

    /** Bank and IFSC are the minimum values we require. */
    if (!bank || !returnedIFSC) {
        return null;
    }

    /**
     * Do not accidentally associate a response for another IFSC
     * with the requested IFSC.
     */
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

    /**
     * Only include payment capability fields if the API actually
     * provided a valid value. We NEVER assume true.
     */
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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cross-runtime AbortError check (avoids relying on DOMException existing globally). */
function isAbortError(error: unknown): boolean {
    return (
        !!error &&
        typeof error === "object" &&
        "name" in error &&
        (error as { name?: unknown }).name === "AbortError"
    );
}

/**
 * Creates an isolated IFSC lookup service instance with its own cache,
 * in-flight request tracking, and configuration.
 *
 * Use this directly when you need:
 * - a custom fetch implementation or base URL (tests, proxies)
 * - independent config for different tenants/environments
 * - a silenced logger
 *
 * For simple app usage, the pre-built singleton exports below
 * (`lookupIFSC`, `isValidIFSC`, `clearIFSCCache`) are usually enough.
 */
export function createIFSCService(options: IFSCServiceOptions = {}) {
    const config = {
        baseUrl: options.baseUrl ?? DEFAULTS.baseUrl,
        timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
        successTtlMs: options.successTtlMs ?? DEFAULTS.successTtlMs,
        negativeTtlMs: options.negativeTtlMs ?? DEFAULTS.negativeTtlMs,
        maxCacheEntries: options.maxCacheEntries ?? DEFAULTS.maxCacheEntries,
        maxRetries: options.maxRetries ?? DEFAULTS.maxRetries,
        retryDelayMs: options.retryDelayMs ?? DEFAULTS.retryDelayMs,
    };

    const logger = options.logger ?? defaultLogger;
    const fetchImpl = options.fetchImpl ?? fetch;

    const cache = new Map<string, CacheEntry>();
    const inFlight = new Map<string, Promise<IFSCDetails | null>>();

    function cleanupCache(): void {
        const now = Date.now();
        for (const [key, entry] of cache.entries()) {
            if (entry.expiresAt <= now) {
                cache.delete(key);
            }
        }
    }

    function setCache(key: string, value: IFSCDetails | null, ttl: number): void {
        cleanupCache();

        /** Prevent unlimited memory usage. */
        if (cache.size >= config.maxCacheEntries) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) {
                cache.delete(oldestKey);
            }
        }

        cache.set(key, { value, expiresAt: Date.now() + ttl });
    }

    /**
     * Retrieve an item from cache.
     *
     * `undefined` means: not cached, or cache expired.
     * `null` means: cached lookup failure/not-found result.
     */
    function getCache(key: string): IFSCDetails | null | undefined {
        const entry = cache.get(key);

        if (!entry) {
            return undefined;
        }

        if (entry.expiresAt <= Date.now()) {
            cache.delete(key);
            return undefined;
        }

        // Re-insert so this key is treated as most-recently-used,
        // giving the eviction policy in setCache() LRU-like behavior.
        cache.delete(key);
        cache.set(key, entry);

        return entry.value;
    }

    async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetchImpl(url, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async function performLookup(clean: string): Promise<IFSCDetails | null> {
        let attempt = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const url = `${config.baseUrl}/${encodeURIComponent(clean)}`;
                const response = await fetchWithTimeout(url, config.timeoutMs);

                /** IFSC Toolkit returns 404 when the IFSC is not found. This is definitive — no retry. */
                if (response.status === 404) {
                    setCache(clean, null, config.negativeTtlMs);
                    return null;
                }

                if (!response.ok) {
                    // 5xx responses are likely transient; 4xx (other than 404) are not.
                    if (response.status >= 500 && attempt < config.maxRetries) {
                        attempt += 1;
                        await sleep(config.retryDelayMs * attempt);
                        continue;
                    }

                    logger.warn(`[IFSC] API request failed: HTTP ${response.status}`, { ifsc: clean });
                    return null;
                }

                let rawData: unknown;

                try {
                    rawData = await response.json();
                } catch {
                    logger.warn("[IFSC] API returned invalid JSON", { ifsc: clean });
                    return null;
                }

                if (!isRazorpayIFSCResponse(rawData)) {
                    logger.warn("[IFSC] API returned an unexpected response format", { ifsc: clean });
                    return null;
                }

                const details = mapIFSCResponse(rawData, clean, logger);

                if (!details) {
                    return null;
                }

                setCache(clean, details, config.successTtlMs);
                return details;
            } catch (error) {
                const timedOut = isAbortError(error);

                // Retry timeouts and network errors (both transient).
                if (attempt < config.maxRetries) {
                    attempt += 1;
                    await sleep(config.retryDelayMs * attempt);
                    continue;
                }

                if (timedOut) {
                    logger.warn(`[IFSC] Lookup timed out: ${clean}`);
                } else {
                    logger.error("[IFSC] Network lookup failed", { ifsc: clean, error });
                }

                // Important: we return null instead of throwing because IFSC
                // lookup should not crash the calling application (e.g. billing flow).
                return null;
            }
        }
    }

    /**
     * Look up an Indian IFSC code.
     *
     * Returns:
     * - IFSCDetails when found
     * - null when invalid/not found/network failure (after retries)
     */
    async function lookupIFSC(ifsc: string): Promise<IFSCDetails | null> {
        if (typeof ifsc !== "string") {
            return null;
        }

        const clean = normalizeIFSC(ifsc);

        /** Validate before making any network request. */
        if (!isValidIFSC(clean)) {
            return null;
        }

        /** Check local cache first. */
        const cached = getCache(clean);
        if (cached !== undefined) {
            return cached;
        }

        /**
         * Deduplicate concurrent lookups for the same IFSC so a burst of
         * callers (re-renders, parallel form fields, etc.) triggers only
         * one network request.
         */
        const existing = inFlight.get(clean);
        if (existing) {
            return existing;
        }

        const promise = performLookup(clean).finally(() => {
            inFlight.delete(clean);
        });

        inFlight.set(clean, promise);
        return promise;
    }

    /**
     * Clear the entire IFSC cache.
     * Useful for: logout, testing, manual refresh.
     */
    function clearIFSCCache(): void {
        cache.clear();
        inFlight.clear();
    }

    /** Lightweight stats for health checks / metrics. */
    function getCacheStats(): { cacheSize: number; inFlightCount: number } {
        return { cacheSize: cache.size, inFlightCount: inFlight.size };
    }

    return { lookupIFSC, clearIFSCCache, getCacheStats, isValidIFSC };
}

/**
 * Default shared instance, suitable for most app usage.
 * For tests or per-tenant configuration, use createIFSCService() instead.
 */
const defaultService = createIFSCService();

export const lookupIFSC = defaultService.lookupIFSC;
export const clearIFSCCache = defaultService.clearIFSCCache;
export const getCacheStats = defaultService.getCacheStats;