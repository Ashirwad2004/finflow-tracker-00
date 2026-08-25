import { supabase } from "@/core/integrations/supabase/client";

export type FeatureRequestStatus = "pending" | "reviewed" | "approved" | "declined" | "completed";

export interface FeatureRequest {
  id: string;
  user_id: string | null;
  user_email: string | null;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  notes: string | null;
  submitted_at: string;
  updated_at: string;
}

// Helper to get auth headers with JWT
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function submitFeatureRequest({
  title,
  description,
}: {
  title: string;
  description: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/api/v1/feature-requests", {
      method: "POST",
      headers,
      body: JSON.stringify({ title, description }),
    });

    if (response.ok) {
      return { success: true };
    }
  } catch (error) {
    console.warn("[featureRequestsApi] Backend submit failed, falling back to direct Supabase:", error);
  }

  // Resilient Supabase fallback
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("feature_requests").insert({
      title: title.trim(),
      description: description.trim(),
      user_id: user?.id || null,
      user_email: user?.email || null,
      status: "pending",
    });

    if (dbError) throw new Error(dbError.message);
    return { success: true };
  } catch (err: any) {
    console.error("[featureRequestsApi] Supabase insert error:", err);
    return { success: false, error: err.message || "Failed to submit feature request." };
  }
}

export async function getFeatureRequests(
  statusFilter?: FeatureRequestStatus | "all"
): Promise<FeatureRequest[]> {
  try {
    const headers = await getAuthHeaders();
    let url = "/api/v1/feature-requests";
    if (statusFilter && statusFilter !== "all") {
      url += `?status=${statusFilter}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      return (await response.json()) as FeatureRequest[];
    }
  } catch (error) {
    console.warn("[featureRequestsApi] Backend fetch failed, falling back to direct Supabase:", error);
  }

  // Resilient Supabase fallback query
  let query = supabase.from("feature_requests").select("*").order("submitted_at", { ascending: false });
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[featureRequestsApi] Supabase fallback query error:", error);
    throw new Error(error.message);
  }

  return (data || []) as FeatureRequest[];
}

export async function updateFeatureRequest(
  id: string,
  updates: { status?: FeatureRequestStatus; notes?: string }
): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/v1/feature-requests/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      return;
    }
  } catch (error) {
    console.warn("[featureRequestsApi] Backend update failed, falling back to direct Supabase:", error);
  }

  // Resilient Supabase fallback update
  const payload: Record<string, any> = {};
  if (updates.status) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { error } = await supabase
    .from("feature_requests")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[featureRequestsApi] Supabase update error:", error);
    throw new Error(error.message);
  }
}