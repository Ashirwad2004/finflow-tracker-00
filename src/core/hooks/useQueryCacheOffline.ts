import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";

const STORAGE_KEY = "FINFLOW_OFFLINE_CACHE";
const PERSIST_KEYS = ["expenses", "sales", "purchases", "parties", "products", "profile"];

// Global module state for debounced localStorage persistence (keeps memory lightweight)
let pendingCacheUpdate: any = null;
let debounceTimeoutId: any = null;

const debouncedSaveToLocalStorage = (queryKey: any, data: any) => {
  try {
    if (!pendingCacheUpdate) {
      const cachedDataStr = localStorage.getItem(STORAGE_KEY);
      pendingCacheUpdate = cachedDataStr ? JSON.parse(cachedDataStr) : {};
    }
    
    const serializedKey = JSON.stringify(queryKey);
    pendingCacheUpdate[serializedKey] = data;

    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
    }

    debounceTimeoutId = setTimeout(() => {
      try {
        if (pendingCacheUpdate) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingCacheUpdate));
          console.log("[Offline Cache] Persisted batched updates to localStorage");
        }
      } catch (e) {
        console.warn("[Offline Cache] Failed to write to localStorage:", e);
      } finally {
        pendingCacheUpdate = null;
        debounceTimeoutId = null;
      }
    }, 300); // 300ms batch debounce
  } catch (err) {
    console.warn("[Offline Cache] Error in debouncedSaveToLocalStorage:", err);
  }
};

export const useQueryCacheOffline = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 1. Restore cache from localStorage on startup/mount
  useEffect(() => {
    try {
      const cachedDataStr = localStorage.getItem(STORAGE_KEY);
      if (cachedDataStr) {
        const cachedQueries = JSON.parse(cachedDataStr);
        Object.entries(cachedQueries).forEach(([keyStr, value]) => {
          try {
            const key = JSON.parse(keyStr);
            queryClient.setQueryData(key, value);
            console.log(`[Offline Cache] Successfully restored: ${keyStr}`);
          } catch (err) {
            console.warn("[Offline Cache] Error restoring key", keyStr, err);
          }
        });
      }
    } catch (e) {
      console.error("[Offline Cache] Failed to load cache from localStorage", e);
    }
  }, [queryClient]);

  // 2. Subscribe to React Query Cache updates to persist future successful fetches (Debounced)
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success" && event.query.state.data) {
        const queryKey = event.query.queryKey;
        const mainKey = String(queryKey[0]);

        if (PERSIST_KEYS.includes(mainKey)) {
          debouncedSaveToLocalStorage(queryKey, event.query.state.data);
        }
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }
    };
  }, [queryClient]);

  // 3. Eager background pre-fetching when user logs in with a 2-second idle delay
  useEffect(() => {
    if (!user?.id || !navigator.onLine) return;

    let delayTimeoutId = setTimeout(() => {
      const warmUpOfflineCache = async () => {
        const userId = user.id;
        console.log("[Offline Cache] Application is idle. Warming up queries in background...");

        const prefetchTasks = [
          // A. Profile
          async () => {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", userId)
                .single();
              if (data) {
                queryClient.setQueryData(["profile", userId], data);
                console.log("[Offline Cache] Pre-fetched profile");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for profile", e);
            }
          },

          // B. Expenses
          async () => {
            try {
              const { data } = await supabase
                .from("expenses")
                .select("*")
                .eq("user_id", userId)
                .order("date", { ascending: false });
              if (data) {
                queryClient.setQueryData(["expenses", userId], data);
                console.log("[Offline Cache] Pre-fetched expenses");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for expenses", e);
            }
          },

          // C. Sales (Invoices)
          async () => {
            try {
              const { data } = await supabase
                .from("sales" as any)
                .select("*")
                .eq("user_id", userId)
                .order("date", { ascending: false });
              if (data) {
                queryClient.setQueryData(["sales", userId], data);
                console.log("[Offline Cache] Pre-fetched sales");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for sales", e);
            }
          },

          // D. Purchases
          async () => {
            try {
              const { data } = await supabase
                .from("purchases" as any)
                .select("*")
                .eq("user_id", userId)
                .order("date", { ascending: false });
              if (data) {
                queryClient.setQueryData(["purchases", userId], data);
                console.log("[Offline Cache] Pre-fetched purchases");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for purchases", e);
            }
          },

          // E. Parties
          async () => {
            try {
              const { data } = await supabase
                .from("parties" as any)
                .select("*")
                .eq("user_id", userId);
              if (data) {
                queryClient.setQueryData(["parties", userId], data);
                console.log("[Offline Cache] Pre-fetched parties");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for parties", e);
            }
          },

          // F. Products (Inventory)
          async () => {
            try {
              const { data } = await supabase
                .from("products" as any)
                .select("*")
                .eq("user_id", userId);
              if (data) {
                queryClient.setQueryData(["products", userId], data);
                console.log("[Offline Cache] Pre-fetched products");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for products", e);
            }
          }
        ];

        await Promise.all(prefetchTasks.map(task => task()));
        console.log("[Offline Cache] Offline cache warm-up completed successfully!");
      };

      warmUpOfflineCache();
    }, 2000); // Start pre-fetching exactly 2 seconds after mount to avoid initial loading lag!

    return () => {
      clearTimeout(delayTimeoutId);
    };
  }, [user?.id, queryClient]);
};
