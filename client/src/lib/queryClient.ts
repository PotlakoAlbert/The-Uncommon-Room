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
  // Get the current token from the Redux store
  const state = store.getState();
  const token = state.auth.token;
  
  const headers: Record<string, string> = {};
  
  // Add Content-Type for JSON requests with data (skip for FormData)
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  if (data && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
  method,
  headers,
  body: data ? (isFormData ? (data as FormData) : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

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

    const res = await fetch(queryKey.join("/") as string, {
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
