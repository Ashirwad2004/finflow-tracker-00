import { supabase } from "@/core/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ---------- Types ----------

export interface AppUser {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  full_name: string | null;
}

export interface SystemTableCount {
  table: string;
  count: number;
  label: string;
}

export interface SystemHealth {
  supabaseStatus: "ok" | "error";
  latencyMs: number;
  checkedAt: string;
}

// ---------- Users ----------

/**
 * Fetches app users from the `profiles` table.
 * Falls back gracefully if the table doesn't exist yet.
 */
export async function getAppUsers(): Promise<AppUser[]> {
  const { data, error } = await db
    .from("profiles")
    .select("id, email, created_at, updated_at, avatar_url, full_name")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    // profiles table might not exist — return empty array gracefully
    console.warn("[adminApi] getAppUsers:", error.message);
    return [];
  }
  return (data ?? []) as AppUser[];
}

// ---------- Table Counts ----------

/**
 * Fetches row counts for key tables so the backend team
 * can see traffic at a glance.
 */
export async function getTableCounts(): Promise<SystemTableCount[]> {
  const tables: { key: string; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "groups", label: "Groups" },
    { key: "profiles", label: "Users" },
    { key: "invoices", label: "Invoices" },
    { key: "demo_requests", label: "Demo Requests" },
  ];

  const results = await Promise.allSettled(
    tables.map(async ({ key, label }) => {
      const { count, error } = await db
        .from(key)
        .select("*", { count: "exact", head: true });

      if (error) return { table: key, label, count: 0 };
      return { table: key, label, count: count ?? 0 };
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { table: tables[i].key, label: tables[i].label, count: 0 }
  );
}

// ---------- System Health ----------

/**
 * Pings Supabase by running a lightweight query and measures latency.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const start = Date.now();
  try {
    await db.from("demo_requests").select("id", { head: true, count: "exact" });
    return {
      supabaseStatus: "ok",
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      supabaseStatus: "error",
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}
