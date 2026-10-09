import { apiClient } from "@/core/api/apiClient";

/**
 * Public intake for custom-work requests.
 *
 * Goes through `apiClient` rather than a bare `fetch("/api/v1/...")` so the
 * request resolves against `VITE_API_URL` in production. A relative path only
 * works behind the dev proxy; in production it hits the static host and comes
 * back 405.
 */

export type BuildType = "feature" | "report" | "integration" | "custom_app";

export interface CustomBuildPayload {
  business_name: string;
  contact_name: string;
  contact_phone: string;
  build_type: BuildType;
  description: string;
  /** Hidden honeypot. Always sent empty by the form; bots fill it in. */
  company_website?: string;
}

export interface CustomBuildResult {
  success: boolean;
  reference: string;
  message: string;
}

/** Pull a usable message out of a FastAPI error, including 422 field errors. */
export function describeSubmitError(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const detail = (response?.data as { detail?: unknown })?.detail;

  if (typeof detail === "string" && detail) return detail;

  // A 422 detail is an array of per-field errors; show the first one.
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg.replace(/^Value error,\s*/, "");
  }

  if (response?.status === 429) {
    return "That's a few requests from this connection already. Please try again later, or call us instead.";
  }

  return "We couldn't send that just now. Please check your connection and try again.";
}

export async function submitCustomBuild(
  payload: CustomBuildPayload,
): Promise<CustomBuildResult> {
  const res = await apiClient.post<CustomBuildResult>(
    "/api/v1/feature-requests/custom-build",
    payload,
  );
  return res.data;
}
