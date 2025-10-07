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
  
  console.log('[apiRequest] Base URL:', baseURL);
  console.log('[apiRequest] Request URL:', url);
  console.log('[apiRequest] Full URL:', fullUrl);
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  // For cart endpoints, handle 401/403 gracefully
  if (isCartEndpoint && (res.status === 401 || res.status === 403)) {
    // Optionally, clear token and mark as unauthenticated
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Optionally, dispatch logout or show toast
    // Return a dummy empty response or throw
    return res;
  }

  // Don't throw on 401 if explicitly requested (useful for cart requests)
  if (res.status === 401 && options?.throwOn401 === false) {
    return res;
  }

  await throwIfResNotOk(res);
  return res;
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
