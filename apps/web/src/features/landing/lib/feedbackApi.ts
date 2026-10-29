import axios from "axios";
import { apiClient } from "@/core/api/apiClient";

export type FeedbackCategory = "all" | "pos" | "inventory" | "gst" | "khata" | "general";

export interface UserFeedbackItem {
  id: string;
  author_name: string;
  business_name: string;
  business_type?: string;
  city?: string;
  state?: string;
  rating: number; // 1 to 5
  category: "pos" | "inventory" | "gst" | "khata" | "general";
  feedback_text: string;
  highlight_figure?: string;
  highlight_label?: string;
  is_verified?: boolean;
  helpful_count: number;
  recommend?: boolean;
  created_at: string;
}

export interface SubmitFeedbackPayload {
  author_name: string;
  business_name: string;
  business_type?: string;
  city?: string;
  state?: string;
  rating: number;
  category: "pos" | "inventory" | "gst" | "khata" | "general";
  feedback_text: string;
  recommend?: boolean;
  contact_phone?: string;
  website_honeypot?: string;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  id: string;
  message: string;
  feedback?: UserFeedbackItem;
}

/**
 * Which reviews this browser has already marked helpful. This is the only
 * thing the section keeps locally: it is a per-viewer convenience, not review
 * content. Reviews themselves are never stored or invented client-side — the
 * wall shows exactly what merchants have submitted to the server, or nothing.
 */
const HELPFUL_STORAGE_KEY = "rupeebill_helpful_feedback_ids";

export function getLikedFeedbackIds(): string[] {
  try {
    const raw = localStorage.getItem(HELPFUL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLikedFeedbackId(id: string) {
  try {
    const existing = getLikedFeedbackIds();
    if (!existing.includes(id)) {
      localStorage.setItem(HELPFUL_STORAGE_KEY, JSON.stringify([...existing, id]));
    }
  } catch {
    // Ignore storage issues
  }
}

/**
 * Fetch published merchant reviews, optionally narrowed to one category.
 * Throws when the server cannot be reached so the caller can say so instead of
 * showing reviews nobody wrote.
 */
export async function fetchFeedbackList(
  category: FeedbackCategory = "all"
): Promise<UserFeedbackItem[]> {
  const queryParam = category !== "all" ? `?category=${category}` : "";
  const res = await apiClient.get<UserFeedbackItem[]>(`/api/v1/feedback${queryParam}`, {
    timeout: 8000,
  });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Submit a merchant's review. A failure is reported to the caller — the review
 * is never faked locally as if it had been published.
 */
export async function submitUserFeedback(
  payload: SubmitFeedbackPayload
): Promise<FeedbackSubmissionResult> {
  const res = await apiClient.post<FeedbackSubmissionResult>("/api/v1/feedback", payload, {
    timeout: 15000,
  });
  return res.data;
}

/**
 * Increment the helpful count on a review. Returns false when the vote did not
 * reach the server.
 */
export async function markFeedbackHelpful(id: string): Promise<boolean> {
  try {
    await apiClient.post(`/api/v1/feedback/${id}/helpful`, {}, { timeout: 8000 });
    saveLikedFeedbackId(id);
    return true;
  } catch {
    return false;
  }
}

/**
 * The server's own wording for a failure when it sent one, so the merchant
 * reads what actually happened rather than a generic apology.
 */
export function getFeedbackErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first?.msg === "string" && first.msg.trim()) return first.msg;
    }
    if (error.response?.status === 429) {
      return "Too many reviews from this connection. Please try again later.";
    }
  }
  return fallback;
}
