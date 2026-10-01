import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/core/integrations/supabase/client";
import { useAuth } from "@/core/lib/auth";
import db from "@/core/offline/db";

const PERSIST_KEYS = [
  "expenses",
  "sales",
  "purchases",
  "parties",
  "products",
  "profile",
  "categories",
  "lent-money",
  "borrowed-money",
  "lent-money-parties",
  "borrowed-money-parties",
  "budget",
  "groups",
  "group-members",
  "group-expenses",
  "all-group-members",
  "online_orders",
  "online_orders_pending_count",
  "subscription_status",
  "profile-is-admin"
];

// Global module state for debounced Dexie persistence (keeps memory lightweight)
let pendingCacheUpdate: Record<string, any> = {};
let debounceTimeoutId: any = null;

const debouncedSaveToIndexedDB = (queryKey: any, data: any) => {
  try {
    const serializedKey = JSON.stringify(queryKey);
    pendingCacheUpdate[serializedKey] = data;

    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
    }

    debounceTimeoutId = setTimeout(() => {
      const commitUpdates = async () => {
        try {
          const updates = Object.entries(pendingCacheUpdate);
          if (updates.length > 0) {
            await db.transaction("rw", db.queryCache, async () => {
              for (const [key, val] of updates) {
                await db.queryCache.put({
                  key,
                  data: val,
                  updatedAt: Date.now()
                });
              }
            });
            console.log(`[Offline Cache] Persisted ${updates.length} batched updates to IndexedDB during idle`);
          }
        } catch (e) {
          console.warn("[Offline Cache] Failed to write to IndexedDB:", e);
        } finally {
          pendingCacheUpdate = {};
          debounceTimeoutId = null;
        }
      };

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(commitUpdates, { timeout: 2000 });
      } else {
        commitUpdates();
      }
    }, 600); // 600ms batch debounce to avoid UI contention
  } catch (err) {
    console.warn("[Offline Cache] Error in debouncedSaveToIndexedDB:", err);
  }
};

export const useQueryCacheOffline = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 1. Restore cache from IndexedDB on startup/mount
  useEffect(() => {
    const restoreCache = async () => {
      try {
        const records = await db.queryCache.toArray();
        records.forEach((record) => {
          try {
            const key = JSON.parse(record.key);
            queryClient.setQueryData(key, record.data);
            console.log(`[Offline Cache] Successfully restored from IndexedDB: ${record.key}`);
          } catch (err) {
            console.warn("[Offline Cache] Error restoring key", record.key, err);
          }
        });
      } catch (e) {
        console.error("[Offline Cache] Failed to load cache from IndexedDB", e);
      }
    };
    restoreCache();
  }, [queryClient]);

  // 2. Subscribe to React Query Cache updates to persist future successful fetches (Debounced)
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === "updated" && event.action.type === "success" && event.query.state.data) {
        const queryKey = event.query.queryKey;
        const mainKey = String(queryKey[0]);

        if (PERSIST_KEYS.includes(mainKey)) {
          debouncedSaveToIndexedDB(queryKey, event.query.state.data);
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
            if (queryClient.getQueryData(["profile", userId])) return;
            try {
              const { data } = await (supabase as any)
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
            if (queryClient.getQueryData(["expenses", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("expenses")
                .select(`
                  *,
                  categories (
                    id,
                    name,
                    color,
                    icon
                  )
                `)
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
            if (queryClient.getQueryData(["sales", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("sales")
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
            if (queryClient.getQueryData(["purchases", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("purchases")
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
            if (queryClient.getQueryData(["parties", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("parties")
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
            if (queryClient.getQueryData(["products", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("products")
                .select("*")
                .eq("user_id", userId);
              if (data) {
                queryClient.setQueryData(["products", userId], data);
                console.log("[Offline Cache] Pre-fetched products");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for products", e);
            }
          },

          // G. Categories (Expense selection helper)
          async () => {
            if (queryClient.getQueryData(["categories"])) return;
            try {
              const { data } = await (supabase as any)
                .from("categories")
                .select("*")
                .order("name");
              if (data) {
                queryClient.setQueryData(["categories"], data);
                console.log("[Offline Cache] Pre-fetched categories");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for categories", e);
            }
          },

          // H. Lent Money
          async () => {
            if (queryClient.getQueryData(["lent-money", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("lent_money")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
              if (data) {
                queryClient.setQueryData(["lent-money", userId], data);

                const pendingData = data.filter((record: any) => record.status === "pending");
                const partyMap = new Map<string, any>();
                pendingData.forEach((record: any) => {
                  const name = record.person_name.trim();
                  const current = partyMap.get(name) || {
                    personName: name,
                    totalPending: 0,
                    count: 0,
                    lastTransactionDate: record.created_at,
                  };
                  current.totalPending += Number(record.amount);
                  current.count += 1;
                  partyMap.set(name, current);
                });
                queryClient.setQueryData(["lent-money-parties", userId], Array.from(partyMap.values()));
                console.log("[Offline Cache] Pre-fetched lent-money");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for lent-money", e);
            }
          },

          // I. Borrowed Money
          async () => {
            if (queryClient.getQueryData(["borrowed-money", userId])) return;
            try {
              const { data } = await (supabase as any)
                .from("borrowed_money")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
              if (data) {
                queryClient.setQueryData(["borrowed-money", userId], data);

                const pendingData = data.filter((record: any) => record.status === "pending");
                const partyMap = new Map<string, any>();
                pendingData.forEach((record: any) => {
                  const name = record.person_name.trim();
                  const current = partyMap.get(name) || {
                    personName: name,
                    totalPending: 0,
                    count: 0,
                    lastTransactionDate: record.created_at,
                  };
                  current.totalPending += Number(record.amount);
                  current.count += 1;
                  partyMap.set(name, current);
                });
                queryClient.setQueryData(["borrowed-money-parties", userId], Array.from(partyMap.values()));
                console.log("[Offline Cache] Pre-fetched borrowed-money");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for borrowed-money", e);
            }
          },

          // J. Online orders pending count
          async () => {
            if (queryClient.getQueryData(["online_orders_pending_count", userId])) return;
            try {
              const { count, error } = await (supabase as any)
                .from("online_orders")
                .select("id", { count: "exact", head: true })
                .eq("store_id", userId)
                .eq("status", "pending");
              if (!error && count !== null) {
                queryClient.setQueryData(["online_orders_pending_count", userId], count);
                console.log("[Offline Cache] Pre-fetched pending order count");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for online orders pending count", e);
            }
          }
        ];

        // Execute sequentially with 350ms idle breaks to keep browser UI frame rate at 60 FPS
        for (const task of prefetchTasks) {
          if (!navigator.onLine) break;
          await task();
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        console.log("[Offline Cache] Offline cache warm-up completed in background.");
      };

      warmUpOfflineCache();
    }, 4000); // 4-second idle delay gives immediate priority to current active screen render

    return () => {
      clearTimeout(delayTimeoutId);
    };
  }, [user?.id, queryClient]);
};
