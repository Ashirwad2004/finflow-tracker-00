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
      body: JSON.stringify({
        title,
        description,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to submit feature request.";
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.detail || errorBody.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[featureRequestsApi] submit error:", error);
    return { success: false, error: error.message || "Failed to submit feature request." };
  }
}

export async function getFeatureRequests(
  statusFilter?: FeatureRequestStatus | "all"
): Promise<FeatureRequest[]> {
  const headers = await getAuthHeaders();
  let url = "/api/v1/feature-requests";
  
  if (statusFilter && statusFilter !== "all") {
    url += `?status=${statusFilter}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch feature requests.";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<FeatureRequest[]>;
}

export async function updateFeatureRequest(
  id: string,
  updates: { status?: FeatureRequestStatus; notes?: string }
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/v1/feature-requests/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    let errorMessage = "Failed to update feature request.";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}
