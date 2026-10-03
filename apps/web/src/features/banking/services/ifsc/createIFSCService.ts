import {
  CacheEntry,
  DEFAULTS,
  defaultLogger,
  IFSCDetails,
  IFSCServiceOptions,
} from "./types";
import {
  isRazorpayIFSCResponse,
  isValidIFSC,
  mapIFSCResponse,
  normalizeIFSC,
} from "./ifscValidation";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

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

    if (cache.size >= config.maxCacheEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }

    cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  function getCache(key: string): IFSCDetails | null | undefined {
    const entry = cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }

    // Re-insert for LRU behavior
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

        if (response.status === 404) {
          setCache(clean, null, config.negativeTtlMs);
          return null;
        }

        if (!response.ok) {
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

        return null;
      }
    }
  }

  async function lookupIFSC(ifsc: string): Promise<IFSCDetails | null> {
    if (typeof ifsc !== "string") {
      return null;
    }

    const clean = normalizeIFSC(ifsc);

    if (!isValidIFSC(clean)) {
      return null;
    }

    const cached = getCache(clean);
    if (cached !== undefined) {
      return cached;
    }

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

  function clearIFSCCache(): void {
    cache.clear();
    inFlight.clear();
  }

  function getCacheStats(): { cacheSize: number; inFlightCount: number } {
    return { cacheSize: cache.size, inFlightCount: inFlight.size };
  }

  return { lookupIFSC, clearIFSCCache, getCacheStats, isValidIFSC };
}
