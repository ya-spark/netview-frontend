import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

/**
 * Get the base API URL from environment variable
 * In development, this uses the proxy, so relative URLs work
 * In production, this returns the full API URL
 */
function getApiBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_NETVIEW_API_URL;
  
  if (!apiUrl) {
    throw new Error('VITE_NETVIEW_API_URL environment variable is not set. Please configure it in your .env file.');
  }
  
  // In development with Vite proxy, use relative URLs
  // In production, use the full URL
  if (import.meta.env.DEV) {
    // Return empty string to use relative URLs (proxy handles it)
    return '';
  }
  
  // In production, return the full API URL
  return apiUrl;
}

/**
 * Build full API URL from a path
 * @param path - API path (e.g., '/api/auth/me')
 * @returns Full URL or relative path depending on environment
 */
function buildApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  if (baseUrl) {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}${normalizedPath}`;
  }
  
  // Return relative path for proxy in development
  return normalizedPath;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  // Use Firebase authentication
  if (auth.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.error('Failed to get Firebase ID token:', error);
    }
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  additionalHeaders?: Record<string, string>,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = { ...authHeaders };
  
  // Merge additional headers if provided
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Build full API URL
  const fullUrl = buildApiUrl(url);
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    
    // Build full API URL from query key
    const path = queryKey.join("/") as string;
    const fullUrl = buildApiUrl(path);
    
    const res = await fetch(fullUrl, {
      headers: authHeaders,
      credentials: "include",
    });

    // Temporarily disabled 401 handling
    // if (unauthorizedBehavior === "returnNull" && res.status === 401) {
    //   return null;
    // }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
