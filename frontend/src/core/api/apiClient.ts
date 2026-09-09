import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { supabase } from "@/core/integrations/supabase/client";

/**
 * Hardened API Client with:
 * 1. In-memory access token storage
 * 2. Automatic bearer token injection
 * 3. Concurrent request subscriber queue on 401 to prevent token refresh stampedes
 */

let inMemoryToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getAuthToken = (): string | null => {
  return inMemoryToken;
};

// Initialize token from active Supabase session
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) {
    inMemoryToken = session.access_token;
  }
});

// Keep in-memory token synchronized with Supabase auth lifecycle
supabase.auth.onAuthStateChange((_event, session) => {
  inMemoryToken = session?.access_token ?? null;
});

export const apiClient = axios.create({
  baseURL: "",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach bearer token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // If in-memory token not yet set, attempt to retrieve from session
    if (!inMemoryToken) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          inMemoryToken = data.session.access_token;
        }
      } catch (e) {
        // Fall through
      }
    }

    if (inMemoryToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 handling with Concurrent Promise Subscriber Queue
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Do not loop if refresh itself fails or request has already been retried
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string | null) => {
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject: (err: any) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !data.session?.access_token) {
        throw refreshError || new Error("Session refresh failed");
      }

      const newToken = data.session.access_token;
      inMemoryToken = newToken;

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }

      processQueue(null, newToken);
      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      inMemoryToken = null;
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;