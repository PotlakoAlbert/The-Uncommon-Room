import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { store } from "../store/store";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { 
    throwOn401?: boolean; // Allow some requests to not throw on 401
  }
): Promise<Response> {
  // Get the current token from Redux store AND localStorage as backup
  const state = store.getState();
  let token = state.auth.token;
  
  // If token is not in Redux store, try to get it from localStorage
  if (!token) {
    token = localStorage.getItem('token');
    console.log('[apiRequest] Token from localStorage:', token ? 'present' : 'missing');
    if (token) {
      console.log('[apiRequest] Token preview:', token.substring(0, 20) + '...');
    }
  } else {
    console.log('[apiRequest] Token from Redux store:', token.substring(0, 20) + '...');
  }
  
  const isCartEndpoint = url.includes('/api/cart');

  const headers: Record<string, string> = {};

  // Add Content-Type for JSON requests with data (skip for FormData)
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  // Always send token if present, regardless of endpoint
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    if (isCartEndpoint) {
      console.log('[apiRequest] Sending token for cart request');
    }
  } else {
    if (isCartEndpoint) {
      console.warn('[apiRequest] No token found for cart request');
    }
  }

  // Construct full URL with base API URL
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  
  // Handle both cases: baseURL with or without /api
  let fullUrl: string;
  if (url.startsWith('http')) {
    fullUrl = url;
  } else {
    // Remove trailing /api from baseURL if present, then add our URL
    const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
    fullUrl = `${cleanBaseURL}${url}`;
  }
  
  console.log('[apiRequest] Environment VITE_API_URL:', import.meta.env.VITE_API_URL || 'undefined');
  console.log('[apiRequest] Base URL:', baseURL);
  console.log('[apiRequest] Request URL:', url);
  console.log('[apiRequest] Full URL:', fullUrl);
  console.log('[apiRequest] Method:', method);
  console.log('[apiRequest] Headers:', headers);
  console.log('[apiRequest] Data:', data ? JSON.stringify(data).substring(0, 100) + '...' : 'none');

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
      credentials: "include",
    });

    console.log('[apiRequest] Response status:', res.status, res.statusText);
    console.log('[apiRequest] Response headers:', Object.fromEntries(res.headers.entries()));
    
    // For cart endpoints, handle 401/403 gracefully
    if (isCartEndpoint && (res.status === 401 || res.status === 403)) {
      console.warn('[apiRequest] Cart endpoint returned 401/403, clearing auth');
      // Optionally, clear token and mark as unauthenticated
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return res;
    }

    // Don't throw on 401 if explicitly requested (useful for cart requests)
    if (res.status === 401 && options?.throwOn401 === false) {
      console.warn('[apiRequest] 401 response, but not throwing due to throwOn401: false');
      return res;
    }

    // Check if response is ok before proceeding
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unable to read error response');
      console.error('[apiRequest] Request failed:', {
        status: res.status,
        statusText: res.statusText,
        url: fullUrl,
        method,
        errorText
      });
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }

    console.log('[apiRequest] Request successful');
    return res;
  } catch (error) {
    console.error('[apiRequest] Fetch error:', {
      error: error instanceof Error ? error.message : error,
      url: fullUrl,
      method,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('[apiRequest] Network error - possible causes:');
      console.error('1. CORS policy blocking the request');
      console.error('2. Server is down or unreachable');
      console.error('3. Network connectivity issues');
      console.error('4. SSL/TLS certificate issues');
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the current token from the Redux store
    const state = store.getState();
    const token = state.auth.token;
    
    const headers: Record<string, string> = {};
    
    // Add Authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Construct full URL with base API URL
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const url = queryKey.join("/") as string;
    
    // Handle both cases: baseURL with or without /api
    let fullUrl: string;
    if (url.startsWith('http')) {
      fullUrl = url;
    } else {
      // Remove trailing /api from baseURL if present, then add our URL
      const cleanBaseURL = baseURL.replace(/\/api\/?$/, '');
      fullUrl = `${cleanBaseURL}${url}`;
    }

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

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
