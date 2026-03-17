import { supabase } from "@/core/integrations/supabase/client";

// ---------- Types ----------
export type DemoStatus = "new" | "called" | "converted" | "spam";

export interface DemoRequest {
  id: string;
  phone: string;
  name: string | null;
  status: DemoStatus;
  notes: string | null;
  ip_hash: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface SubmitDemoPayload {
  phone: string;
  name?: string;
}

// ---------- Helpers ----------

/** Normalise an Indian phone number to E.164 (+91XXXXXXXXXX) */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+91${digits.slice(1)}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

/** Validate an Indian mobile number (starts with 6-9, 10 digits after prefix) */
export function validateIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const core =
    digits.startsWith("91") && digits.length === 12
      ? digits.slice(2)
      : digits.startsWith("0") && digits.length === 11
      ? digits.slice(1)
      : digits;

  if (!/^[6-9]\d{9}$/.test(core)) {
    return "Enter a valid 10-digit Indian mobile number (starts with 6–9)";
  }
  return null;
}

/** SHA-256 hash a string (for IP privacy) */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cast to `any` so we can query tables not yet in the auto-generated types.
// After running the SQL migration, regenerate types with `supabase gen types`
// and remove this cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ---------- Public API ----------

/**
 * Submit a demo request.
 * Checks a 24-hour per-phone cooldown before inserting.
 */
export async function submitDemoRequest({
  phone,
  name,
}: SubmitDemoPayload): Promise<{ success: boolean; error?: string }> {
  const normalised = normalisePhone(phone);

  // 1. Validate
  const validationError = validateIndianPhone(phone);
  if (validationError) return { success: false, error: validationError };

  // 2. Check cooldown (same phone within 24h)
  const { data: cooldown } = await db
    .from("demo_cooldowns")
    .select("last_at")
    .eq("phone", normalised)
    .maybeSingle();

  if (cooldown) {
    const lastAt = new Date(cooldown.last_at).getTime();
    const hoursAgo = (Date.now() - lastAt) / (1000 * 60 * 60);
    if (hoursAgo < 24) {
      const remaining = Math.ceil(24 - hoursAgo);
      return {
        success: false,
        error: `You already requested a demo. Try again in ${remaining} hour${remaining !== 1 ? "s" : ""}.`,
      };
    }
  }

  // 3. Hash IP for spam tracking (privacy-preserving)
  let ipHash: string | null = null;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = await res.json();
    ipHash = await sha256(json.ip);
  } catch {
    // Non-fatal — proceed without IP hash
  }

  // 4. Insert demo request
  const { error: insertError } = await db.from("demo_requests").insert({
    phone: normalised,
    name: name?.trim() || null,
    status: "new",
    ip_hash: ipHash,
  });

  if (insertError) {
    console.error("[demoApi] insert error:", insertError);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  // 5. Upsert cooldown record
  await db.from("demo_cooldowns").upsert(
    { phone: normalised, last_at: new Date().toISOString() },
    { onConflict: "phone" }
  );

  return { success: true };
}

// ---------- Admin API ----------

export async function getDemoRequests(
  statusFilter?: DemoStatus | "all"
): Promise<DemoRequest[]> {
  let query = db
    .from("demo_requests")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DemoRequest[];
}

export async function updateDemoRequest(
  id: string,
  updates: { status?: DemoStatus; notes?: string }
): Promise<void> {
  const { error } = await db
    .from("demo_requests")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}