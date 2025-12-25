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
  logger.info('Setting current user info in queryClient', {
    component: 'queryClient',
    action: 'set_current_user_info',
    email: email,
    tenantId: tenantId,
    tenantIdType: tenantId ? typeof tenantId : 'undefined',
    tenantIdString: tenantId ? String(tenantId) : 'undefined',
    clearing: email === undefined && tenantId === undefined,
  });
  
  if (email === undefined && tenantId === undefined) {
    // Explicitly clear the state
    currentUserInfo = {};
    logger.info('Cleared current user info', {
      component: 'queryClient',
      action: 'set_current_user_info',
    });
  } else {
    currentUserInfo = { email, tenantId };
    logger.info('Updated current user info', {
      component: 'queryClient',
      action: 'set_current_user_info',
      currentUserInfo: { ...currentUserInfo },
    });
  }
}

/**
 * Check if an endpoint is public (doesn't require authentication)
 */
function isPublicEndpoint(path: string): boolean {
  const publicEndpoints = [
    '/health',
    '/docs',
    '/openapi.json'
  ];
  
  return publicEndpoints.some(endpoint => path.startsWith(endpoint));
}

/**
 * Check if an endpoint requires tenant ID
 * Auth endpoints that work before user has a tenant don't require tenant_id:
 * - /api/auth/me - Get/update user info
 * - /api/auth/send-verification-code - Send email verification code
 * - /api/auth/verify-code - Verify email code
 */
function requiresTenantId(path: string): boolean {
  // Public endpoints don't require tenant ID
  if (isPublicEndpoint(path)) {
    return false;
  }
  
  // Auth endpoints that don't require tenant_id (user might not have tenants yet)
  const authEndpointsWithoutTenant = [
    '/api/auth/me',
    '/api/auth/send-verification-code',
    '/api/auth/verify-code',
    '/api/auth/logout' // Logout should work even without tenant ID
  ];
  
  if (authEndpointsWithoutTenant.some(endpoint => path.startsWith(endpoint))) {
    return false;
  }
  
  // All other authenticated endpoints require tenant ID
  return true;
}

/**
 * Get tenant ID from available sources
 */
function getTenantId(): string | null {
  logger.debug('Getting tenant ID', {
    component: 'queryClient',
    action: 'get_tenant_id',
    currentUserInfo: { ...currentUserInfo },
  });
  
  // First check currentUserInfo
  if (currentUserInfo.tenantId) {
      logger.debug('Tenant ID found in currentUserInfo', {
        component: 'queryClient',
        action: 'get_tenant_id',
        tenantIdStr: currentUserInfo.tenantId,
        source: 'currentUserInfo',
      });
    return currentUserInfo.tenantId;
  }
  
  // Then check localStorage
  try {
    const savedTenant = localStorage.getItem('selectedTenant');
    logger.debug('Checking localStorage for tenant', {
      component: 'queryClient',
      action: 'get_tenant_id',
      hasSavedTenant: !!savedTenant,
      savedTenantValue: savedTenant,
    });
    
    if (savedTenant) {
      const tenant = JSON.parse(savedTenant);
      const tenantId = tenant.id ? String(tenant.id) : null;
      
      if (tenantId) {
        logger.debug('Tenant ID found in localStorage', {
          component: 'queryClient',
          action: 'get_tenant_id',
          tenantIdStr: tenantId,
          source: 'localStorage',
        });
        
        // Update currentUserInfo for future requests
        currentUserInfo.tenantId = tenantId;
        if (tenant.email) {
          currentUserInfo.email = tenant.email;
        }
        
        logger.debug('Updated currentUserInfo from localStorage', {
          component: 'queryClient',
          action: 'get_tenant_id',
          currentUserInfo: { ...currentUserInfo },
        });
        
        return tenantId;
      } else {
        logger.debug('Tenant found in localStorage but no ID', {
          component: 'queryClient',
          action: 'get_tenant_id',
          tenantData: tenant,
        });
      }
    }
  } catch (e) {
    logger.warn('Error reading tenant from localStorage', {
      component: 'queryClient',
      action: 'get_tenant_id',
      error: e instanceof Error ? e.message : String(e),
    });
  }
  
  logger.debug('No tenant ID found in any source', {
    component: 'queryClient',
    action: 'get_tenant_id',
    currentUserInfo: { ...currentUserInfo },
  });
  
  return null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  logger.debug('Getting auth headers', {
    component: 'queryClient',
    action: 'get_auth_headers',
    currentUserInfo: { ...currentUserInfo },
  });
  
  const headers: Record<string, string> = {};
  
  // Get Firebase ID token for authentication
  const token = await getIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    logger.debug('Firebase token obtained', {
      component: 'queryClient',
      action: 'get_auth_headers',
      hasToken: true,
    });
  } else {
    logger.debug('No Firebase token available', {
      component: 'queryClient',
      action: 'get_auth_headers',
    });
  }
  
  // In dev mode, backend middleware requires X-User-Email and X-Tenant-ID headers
  // Try to get email from Firebase user
  const firebaseUser = getCurrentUser();
  if (firebaseUser?.email) {
    headers['X-User-Email'] = firebaseUser.email;
    logger.debug('User email from Firebase', {
      component: 'queryClient',
      action: 'get_auth_headers',
      email: firebaseUser.email,
    });
  } else if (currentUserInfo.email) {
    // Fallback to stored user info
    headers['X-User-Email'] = currentUserInfo.email;
    logger.debug('User email from currentUserInfo', {
      component: 'queryClient',
      action: 'get_auth_headers',
      email: currentUserInfo.email,
    });
  } else {
    logger.debug('No user email available', {
      component: 'queryClient',
      action: 'get_auth_headers',
    });
  }
  
  // Get tenant ID - prioritize from currentUserInfo, but also check localStorage as fallback
  let tenantId = currentUserInfo.tenantId;
  
  logger.info('Retrieving tenant ID for API headers', {
    component: 'queryClient',
    action: 'get_auth_headers',
    hasTenantIdInCurrentUserInfo: !!tenantId,
    tenantIdFromCurrentUserInfo: tenantId,
    tenantIdType: tenantId ? typeof tenantId : 'null',
    currentUserInfo: { ...currentUserInfo },
  });
  
  // If not in currentUserInfo, try to get from localStorage (selectedTenant)
  if (!tenantId) {
    try {
      const savedTenant = localStorage.getItem('selectedTenant');
      logger.info('Tenant ID not in currentUserInfo, checking localStorage', {
        component: 'queryClient',
        action: 'get_auth_headers',
        hasSavedTenant: !!savedTenant,
        savedTenantRaw: savedTenant,
      });
      
      if (savedTenant) {
        const tenant = JSON.parse(savedTenant);
        tenantId = tenant.id;
        logger.info('Retrieved tenant ID from localStorage', {
          component: 'queryClient',
          action: 'get_auth_headers',
          tenantId: tenantId,
          tenantIdType: typeof tenantId,
          tenantIdString: String(tenantId),
          tenantData: tenant,
        });
        
        // Update currentUserInfo for future requests
        if (tenantId && firebaseUser?.email) {
          currentUserInfo.tenantId = String(tenantId);
          currentUserInfo.email = firebaseUser.email;
          logger.info('Updated currentUserInfo from localStorage', {
            component: 'queryClient',
            action: 'get_auth_headers',
            tenantId: tenantId,
            tenantIdType: typeof tenantId,
            tenantIdString: String(tenantId),
            currentUserInfo: { ...currentUserInfo },
          });
        }
      } else {
        logger.warn('No tenant found in localStorage', {
          component: 'queryClient',
          action: 'get_auth_headers',
        });
      }
    } catch (e) {
      logger.error('Error reading tenant from localStorage in getAuthHeaders', e instanceof Error ? e : new Error(String(e)), {
        component: 'queryClient',
        action: 'get_auth_headers',
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  
  if (tenantId) {
    const tenantIdString = String(tenantId);
    headers['X-Tenant-ID'] = tenantIdString;
    logger.info('Tenant ID added to API request headers', {
      component: 'queryClient',
      action: 'get_auth_headers',
      tenantId: tenantId,
      tenantIdType: typeof tenantId,
      tenantIdString: tenantIdString,
      headerValue: headers['X-Tenant-ID'],
    });
  } else {
    logger.warn('No tenant ID available for API headers', {
      component: 'queryClient',
      action: 'get_auth_headers',
      currentUserInfo: { ...currentUserInfo },
    });
  }
  
  logger.info('Auth headers prepared for API request', {
    component: 'queryClient',
    action: 'get_auth_headers',
    hasAuthToken: !!headers['Authorization'],
    hasUserEmail: !!headers['X-User-Email'],
    hasTenantId: !!headers['X-Tenant-ID'],
    tenantIdHeader: headers['X-Tenant-ID'],
    userEmailHeader: headers['X-User-Email'],
  });
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  additionalHeaders?: Record<string, string>,
): Promise<Response> {
  // Build full API URL
  const fullUrl = buildApiUrl(url);
  
  // Check if authentication is required for this endpoint
  if (!isPublicEndpoint(url)) {
    // Check if user is authenticated before making the request
    const token = await getIdToken();
    if (!token) {
      const error = new ApiError(
        401,
        'Authentication required',
        'AUTHENTICATION_REQUIRED',
        { endpoint: url }
      );
      logger.warn('API request blocked - no authentication', {
        component: 'queryClient',
        action: 'api_request',
        method,
        url: fullUrl,
        reason: 'no_token',
      });
      throw error;
    }
    
    // Check if tenant ID is required and available
    if (requiresTenantId(url)) {
      logger.debug('Endpoint requires tenant ID, checking availability', {
        component: 'queryClient',
        action: 'api_request',
        method,
        url: fullUrl,
        endpoint: url,
        currentUserInfo: { ...currentUserInfo },
      });
      
      const tenantId = getTenantId();
      
      logger.debug('Tenant ID check result', {
        component: 'queryClient',
        action: 'api_request',
        method,
        url: fullUrl,
        hasTenantId: !!tenantId,
        tenantIdStr: tenantId,
      });
      
      if (!tenantId) {
        // Log detailed state for debugging
        let localStorageTenant = null;
        try {
          const saved = localStorage.getItem('selectedTenant');
          if (saved) {
            localStorageTenant = JSON.parse(saved);
          }
        } catch (e) {
          // Ignore
        }
        
        const error = new ApiError(
          401,
          'Tenant ID required',
          'TENANT_ID_REQUIRED',
          { endpoint: url }
        );
        logger.warn('API request blocked - no tenant ID', {
          component: 'queryClient',
          action: 'api_request',
          method,
          url: fullUrl,
          reason: 'no_tenant_id',
          currentUserInfo: { ...currentUserInfo },
          localStorageTenant: localStorageTenant,
          localStorageRaw: localStorage.getItem('selectedTenant'),
        });
        throw error;
      }
      
      logger.debug('Tenant ID available, proceeding with request', {
        component: 'queryClient',
        action: 'api_request',
        method,
        url: fullUrl,
        tenantIdStr: tenantId,
      });
    } else {
      logger.debug('Endpoint does not require tenant ID', {
        component: 'queryClient',
        action: 'api_request',
        method,
        url: fullUrl,
        endpoint: url,
      });
    }
  }
  
  const authHeaders = await getAuthHeaders();
  
  logger.debug('Auth headers prepared', {
    component: 'queryClient',
    action: 'api_request',
    method,
    url: fullUrl,
    hasAuthToken: !!authHeaders['Authorization'],
    hasUserEmail: !!authHeaders['X-User-Email'],
    hasTenantId: !!authHeaders['X-Tenant-ID'],
    tenantIdStr: authHeaders['X-Tenant-ID'],
  });
  
  const headers: Record<string, string> = { ...authHeaders };
  
  // Merge additional headers if provided
  if (additionalHeaders) {
    Object.assign(headers, additionalHeaders);
  }
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  logger.debug('Making API request', {
    component: 'queryClient',
    action: 'api_request',
    method,
    url: fullUrl,
    hasData: !!data,
  });
  
  const startTime = Date.now();
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    const duration = Date.now() - startTime;
    
    logger.debug('API request completed', {
      component: 'queryClient',
      action: 'api_request',
      method,
      url: fullUrl,
      status: res.status,
      duration: `${duration}ms`,
    });

    await throwIfResNotOk(res, fullUrl);
    return res;
  } catch (error) {
    const duration = Date.now() - startTime;
    const err = error instanceof Error ? error : new Error(String(error));
    
    logger.error('API request failed', err, {
      component: 'queryClient',
      action: 'api_request',
      method,
      url: fullUrl,
      duration: `${duration}ms`,
    });
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build full API URL from query key
    const path = queryKey.join("/") as string;
    const fullUrl = buildApiUrl(path);
    
    // Check if authentication is required for this endpoint
    if (!isPublicEndpoint(path)) {
      // Check if user is authenticated before making the request
      const token = await getIdToken();
      if (!token) {
        const error = new ApiError(
          401,
          'Authentication required',
          'AUTHENTICATION_REQUIRED',
          { endpoint: path }
        );
        logger.warn('Query blocked - no authentication', {
          component: 'queryClient',
          action: 'query_fn',
          path,
          reason: 'no_token',
        });
        throw error;
      }
      
      // Check if tenant ID is required and available
      if (requiresTenantId(path)) {
        logger.debug('Query endpoint requires tenant ID, checking availability', {
          component: 'queryClient',
          action: 'query_fn',
          path,
          fullUrl,
          currentUserInfo: { ...currentUserInfo },
        });
        
        const tenantId = getTenantId();
        
        logger.debug('Query tenant ID check result', {
          component: 'queryClient',
          action: 'query_fn',
          path,
          fullUrl,
          hasTenantId: !!tenantId,
          tenantIdStr: tenantId,
        });
        
        if (!tenantId) {
          // Log detailed state for debugging
          let localStorageTenant = null;
          try {
            const saved = localStorage.getItem('selectedTenant');
            if (saved) {
              localStorageTenant = JSON.parse(saved);
            }
          } catch (e) {
            // Ignore
          }
          
          const error = new ApiError(
            401,
            'Tenant ID required',
            'TENANT_ID_REQUIRED',
            { endpoint: path }
          );
          logger.warn('Query blocked - no tenant ID', {
            component: 'queryClient',
            action: 'query_fn',
            path,
            fullUrl,
            reason: 'no_tenant_id',
            currentUserInfo: { ...currentUserInfo },
            localStorageTenant: localStorageTenant,
            localStorageRaw: localStorage.getItem('selectedTenant'),
          });
          throw error;
        }
        
        logger.debug('Query tenant ID available, proceeding', {
          component: 'queryClient',
          action: 'query_fn',
          path,
          fullUrl,
          tenantIdStr: tenantId,
        });
      } else {
        logger.debug('Query endpoint does not require tenant ID', {
          component: 'queryClient',
          action: 'query_fn',
          path,
          fullUrl,
        });
      }
    }
    
    const authHeaders = await getAuthHeaders();
    
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
