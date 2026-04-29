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
  checkedAt: string;
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
    } else {
      console.error("Please run the admin_get_users_rpc.sql script in your Supabase SQL editor!");
      // Optionally use alert so the user really sees it
      // alert("Error loading users: " + error.message + "\n\nPlease run the admin_get_users_rpc.sql script in your Supabase Dashboard!");
    }
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
