import { API_URL } from './constants';

/**
 * Fetch wrapper for all Scout API calls.
 * - Prepends API_URL to all paths
 * - Sets credentials: 'include' for cookie auth
 * - On 401: attempts silent token refresh, retries original request
 * - If refresh fails: redirects to /login
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/v1/refresh-accesstoken`, {
      method: 'GET',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function handleTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = attemptTokenRefresh();

  try {
    const success = await refreshPromise;
    return success;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

export type CustomRequestInit = RequestInit & { skipRedirect?: boolean };

export async function fetchApi<T>(
  path: string,
  options: CustomRequestInit = {}
): Promise<{ data: T; message: string; success: boolean; statusCode: number }> {
  const url = `${API_URL}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Set Content-Type for requests with a body
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const { skipRedirect, ...restOptions } = options;

  const requestOptions: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include',
  };

  let response = await fetch(url, requestOptions);

  // Handle 401 — attempt silent refresh
  if (response.status === 401) {
    const refreshed = await handleTokenRefresh();

    if (refreshed) {
      // Retry the original request with fresh cookies
      response = await fetch(url, requestOptions);
    } else {
      // Refresh failed
      if (!skipRedirect) {
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }
  }

  // Intercept HTTP errors and read the body to provide descriptive logs
  if (!response.ok) {
    let errorMsg = `Server Error (HTTP ${response.status})`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorJson = await response.clone().json();
        errorMsg = errorJson.message || errorJson.error || errorMsg;
      } else {
        const errorText = await response.clone().text();
        errorMsg = errorText.slice(0, 300) || errorMsg;
      }
    } catch (e) {
      errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  const json = await response.json();
  return json;
}

// Convenience methods
export const api = {
  get: <T>(path: string, options?: CustomRequestInit) =>
    fetchApi<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: CustomRequestInit) =>
    fetchApi<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: CustomRequestInit) =>
    fetchApi<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: CustomRequestInit) =>
    fetchApi<T>(path, { ...options, method: 'DELETE' }),
};

