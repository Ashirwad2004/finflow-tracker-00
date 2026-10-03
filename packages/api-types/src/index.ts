/**
 * @rupaybill/api-types
 * Generated and shared TypeScript contracts derived from the FastAPI backend schema.
 */

export * from "./generated";

export interface ApiResponse<T = any> {
  status: string;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
}

export interface CompletionRequest {
  messages: AiMessage[];
  model?: string | null;
  temperature?: number | null;
  maxOutputTokens?: number | null;
  response_format?: Record<string, any> | null;
  stream?: boolean | null;
}

export interface CompletionResponse {
  text: string;
  choices: Array<Record<string, any>>;
}
