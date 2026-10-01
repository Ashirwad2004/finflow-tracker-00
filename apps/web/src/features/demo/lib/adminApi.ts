import { supabase } from "@/core/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ---------- Types ----------

export interface AppUser {
  id: string;
  user_id?: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  full_name: string | null;
  business_name?: string | null;
  gst_number?: string | null;
  business_phone?: string | null;
  business_address?: string | null;
  business_logo?: string | null;
  signature_url?: string | null;
  is_admin?: boolean;
  is_business_mode?: boolean;
}

export interface SystemTableCount {
  table: string;
  count: number;
  label: string;
}

export interface SystemHealth {
  supabaseStatus: "ok" | "error";
  latencyMs: number;
  dbExecutionMs: number;
  checkedAt: string;
  tableCounts?: SystemTableCount[];
}

// ---------- Users ----------

/**
 * Fetches app users via RPC to bypass RLS and join with auth.users for emails.
 */
export async function getAppUsers(): Promise<AppUser[]> {
  const { data, error } = await db.rpc("get_admin_users");

  if (error) {
    console.warn("[adminApi] getAppUsers RPC error:", error.message);
    if (typeof window !== "undefined" && (window as any).toast) {
      (window as any).toast.error("Failed to load users: " + error.message + ". Did you run the SQL script?");
    }
    return [];
  }
  return (data ?? []) as AppUser[];
}

// ---------- Table Counts ----------

function formatTableLabel(tableName: string): string {
  if (tableName === "profiles") return "Users";
  return tableName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ---------- Table Counts ----------

/**
 * Fetches row counts dynamically using server-side RPC or fallback queries.
 */
export async function getTableCounts(): Promise<SystemTableCount[]> {
  const health = await getSystemHealth();
  if (health.tableCounts && health.tableCounts.length > 0) {
    return health.tableCounts;
  }

  const defaultKeys = ["expenses", "groups", "profiles", "invoices", "demo_requests"];
  const results = await Promise.allSettled(
    defaultKeys.map(async (key) => {
      const { count, error } = await db
        .from(key)
        .select("*", { count: "planned", head: true });

      if (error) return { table: key, label: formatTableLabel(key), count: 0 };
      return { table: key, label: formatTableLabel(key), count: count ?? 0 };
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { table: defaultKeys[i], label: formatTableLabel(defaultKeys[i]), count: 0 }
  );
}

// ---------- System Health ----------

/**
 * Pings Supabase via single RPC call to fetch server DB engine execution time, RTT, and stats.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const start = Date.now();
  try {
    const { data, error } = await db.rpc("get_system_health_metrics");
    const networkRtt = Date.now() - start;

    if (error || !data) {
      // Fallback ping if RPC is initializing
      const fallbackStart = Date.now();
      await db.from("demo_requests").select("id").limit(1);
      const measuredPing = Date.now() - fallbackStart;
      return {
        supabaseStatus: "ok",
        latencyMs: measuredPing,
        dbExecutionMs: measuredPing,
        checkedAt: new Date().toISOString(),
      };
    }

    const countsMap = data.table_counts || {};
    const tableCounts: SystemTableCount[] = Object.keys(countsMap).map((key) => ({
      table: key,
      label: formatTableLabel(key),
      count: Number(countsMap[key] || 0),
    }));

    return {
      supabaseStatus: "ok",
      latencyMs: networkRtt,
      dbExecutionMs: Number(data.db_execution_ms || 0),
      checkedAt: new Date().toISOString(),
      tableCounts,
    };
  } catch {
    const totalTime = Date.now() - start;
    return {
      supabaseStatus: "error",
      latencyMs: totalTime,
      dbExecutionMs: totalTime,
      checkedAt: new Date().toISOString(),
    };
  }
}

// ---------- Role Management ----------

/**
 * Promotes or demotes an employee directly from the Admin UI using RPC.
 */
export async function toggleUserAdminStatus(targetUserId: string, makeAdmin: boolean): Promise<boolean> {
  const { data, error } = await db.rpc("set_user_admin_status", {
    target_user_id: targetUserId,
    make_admin: makeAdmin,
  });

  if (error) {
    console.error("[adminApi] toggleUserAdminStatus error:", error.message);
    throw new Error(error.message);
  }
  return !!data;
}
