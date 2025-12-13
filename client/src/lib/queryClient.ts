import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getIdToken, getCurrentUser } from "./firebase";
import { logger } from "./logger";

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

// Store error handler callback
let globalErrorHandler: ((error: Error) => void) | null = null;

export function setGlobalErrorHandler(handler: (error: Error) => void) {
  globalErrorHandler = handler;
}

/**
 * Custom error class for API errors with structured error information
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(status: number, message: string, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function throwIfResNotOk(res: Response, url?: string) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorCode: string | undefined;
    let errorDetails: any;

    try {
      // Try to parse JSON error response
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        logger.debug('Parsed error response', {
          component: 'queryClient',
          action: 'parse_error',
          status: res.status,
        }, errorData);
        
        // Handle different error response formats
        if (errorData.error) {
          errorMessage = errorData.error.message || errorMessage;
          errorCode = errorData.error.code;
          errorDetails = errorData.error.details || errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
          errorCode = errorData.code;
          errorDetails = errorData.details || errorData;
        } else {
          // Fallback: use the whole response as details
          errorDetails = errorData;
        }
      } else {
        // Not JSON, read as text
        const text = await res.text();
        errorMessage = text || errorMessage;
      }
    } catch (parseError) {
      const err = parseError instanceof Error ? parseError : new Error(String(parseError));
      logger.debug('Failed to parse error response, trying text', {
        component: 'queryClient',
        action: 'parse_error_fallback',
        status: res.status,
        url,
      }, err);
      // If parsing fails, read as text
      try {
        const text = await res.text();
        errorMessage = text || res.statusText;
      } catch {
        // Fallback to status text
        errorMessage = res.statusText;
      }
    }
    
    logger.debug('Error parsed', {
      component: 'queryClient',
      action: 'parse_error',
      status: res.status,
      code: errorCode,
      message: errorMessage,
    }, errorDetails);

    const error = new ApiError(res.status, errorMessage, errorCode, errorDetails);
    
    // For critical errors (401, 403, 500), trigger global error handler
    // But skip for EMAIL_NOT_VERIFIED and verification-related endpoints as they're handled specially
    // Also skip for notification endpoints - they handle errors locally
    const isVerificationEndpoint = url ? (url.includes('/send-verification-code') || url.includes('/verify-code')) : false;
    const isNotificationEndpoint = url ? (url.includes('/notifications/user')) : false;
    if ((res.status === 401 || res.status === 403 || res.status === 500) && 
        errorCode !== 'EMAIL_NOT_VERIFIED' && 
        !isVerificationEndpoint &&
        !isNotificationEndpoint) {
      if (globalErrorHandler) {
        globalErrorHandler(error);
      }
    }
    
    throw error;
  }
}

// Global store for user info (updated by AuthContext)
let currentUserInfo: { email?: string; tenantId?: string } = {};

export function setCurrentUserInfo(email?: string, tenantId?: string) {
  if (email === undefined && tenantId === undefined) {
    // Explicitly clear the state
    currentUserInfo = {};
  } else {
    currentUserInfo = { email, tenantId };
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  
  // Get Firebase ID token for authentication
  const token = await getIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // In dev mode, backend middleware requires X-User-Email and X-Tenant-ID headers
  // Try to get email from Firebase user
  const firebaseUser = getCurrentUser();
  if (firebaseUser?.email) {
    headers['X-User-Email'] = firebaseUser.email;
  } else if (currentUserInfo.email) {
    // Fallback to stored user info
    headers['X-User-Email'] = currentUserInfo.email;
  }
  
  // Get tenant ID from stored user info
  if (currentUserInfo.tenantId) {
    headers['X-Tenant-ID'] = currentUserInfo.tenantId;
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

  await throwIfResNotOk(res, fullUrl);
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

    await throwIfResNotOk(res, fullUrl);
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
