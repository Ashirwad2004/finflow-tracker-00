/**
 * @rupaybill/api-types
 * Generated and shared TypeScript contracts derived from the FastAPI backend schema.
 */

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
