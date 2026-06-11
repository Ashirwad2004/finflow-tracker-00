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
  "online_orders_pending_count"
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

    debounceTimeoutId = setTimeout(async () => {
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
          console.log(`[Offline Cache] Persisted ${updates.length} batched updates to IndexedDB`);
        }
      } catch (e) {
        console.warn("[Offline Cache] Failed to write to IndexedDB:", e);
      } finally {
        pendingCacheUpdate = {};
        debounceTimeoutId = null;
      }
    }, 300); // 300ms batch debounce
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
            try {
              const { data } = await (supabase as any)
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
            try {
              const { data } = await (supabase as any)
                .from("lent_money")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
              if (data) {
                queryClient.setQueryData(["lent-money", userId], data);
                console.log("[Offline Cache] Pre-fetched lent-money");

                // Generate lent-money-parties
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
                console.log("[Offline Cache] Pre-fetched lent-money-parties");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for lent-money", e);
            }
          },

          // I. Borrowed Money
          async () => {
            try {
              const { data } = await (supabase as any)
                .from("borrowed_money")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
              if (data) {
                queryClient.setQueryData(["borrowed-money", userId], data);
                console.log("[Offline Cache] Pre-fetched borrowed-money");

                // Generate borrowed-money-parties
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
                console.log("[Offline Cache] Pre-fetched borrowed-money-parties");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for borrowed-money", e);
            }
          },

          // J. Groups hierarchy
          async () => {
            try {
              const { data: memberships } = await (supabase as any)
                .from("group_members")
                .select("group_id")
                .eq("user_id", userId);
              if (memberships && memberships.length > 0) {
                const groupIds = memberships.map((m: any) => m.group_id);
                const { data: groupsData } = await (supabase as any)
                  .from("groups")
                  .select("*")
                  .in("id", groupIds);
                if (groupsData) {
                  queryClient.setQueryData(["groups", userId], groupsData);
                  console.log("[Offline Cache] Pre-fetched groups");
                  for (const group of groupsData) {
                    queryClient.setQueryData(["group", group.id], group);
                    const { data: mems } = await (supabase as any)
                      .from("group_members")
                      .select("*")
                      .eq("group_id", group.id)
                      .order("joined_at");
                    if (mems) {
                      queryClient.setQueryData(["group-members", group.id], mems);
                    }
                    const { data: exps } = await (supabase as any)
                      .from("group_expenses")
                      .select("*, categories(name, color, icon)")
                      .eq("group_id", group.id)
                      .order("date", { ascending: false });
                    if (exps) {
                      queryClient.setQueryData(["group-expenses", group.id], exps);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for groups hierarchy", e);
            }
          },

          // K. All group members list
          async () => {
            try {
              const { data } = await (supabase as any)
                .from("group_members")
                .select("group_id, user_id, username");
              if (data) {
                queryClient.setQueryData(["all-group-members"], data);
                console.log("[Offline Cache] Pre-fetched all-group-members");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for all-group-members", e);
            }
          },

          // L. Online orders
          async () => {
            try {
              const { data } = await (supabase as any)
                .from("online_orders")
                .select(`
                  *,
                  online_order_items (
                    id,
                    product_id,
                    quantity,
                    price_at_time,
                    products ( name )
                  )
                `)
                .eq("store_id", userId)
                .order("created_at", { ascending: false });
              if (data) {
                queryClient.setQueryData(["online_orders", userId], data);
                console.log("[Offline Cache] Pre-fetched online orders");
              }
            } catch (e) {
              console.warn("[Offline Cache] Pre-fetch failed for online orders", e);
            }
          },

          // M. Online orders pending count
          async () => {
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
