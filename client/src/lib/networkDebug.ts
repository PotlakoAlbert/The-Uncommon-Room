// Network debugging utilities
export async function testNetworkConnectivity() {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const testUrls = [
    `${baseURL}/api/products`,
    `${baseURL}/health`,
    `${baseURL}/`,
    'https://httpbin.org/get', // External test to verify general internet connectivity
  ];

  console.log('[NetworkTest] Starting connectivity tests...');
  console.log('[NetworkTest] Base URL:', baseURL);

  for (const url of testUrls) {
    try {
      console.log(`[NetworkTest] Testing: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
      });

      clearTimeout(timeoutId);
      
      console.log(`[NetworkTest] ✅ ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      console.error(`[NetworkTest] ❌ ${url}:`, {
        error: error instanceof Error ? error.message : error,
        type: error instanceof Error ? error.constructor.name : typeof error,
      });
    }
  }
  
  console.log('[NetworkTest] Connectivity tests completed');
}

export async function testBackendHealth() {
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  
  try {
    console.log('[HealthCheck] Testing backend health...');
    const response = await fetch(`${baseURL}/api/products`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[HealthCheck] ✅ Backend is responding:', {
        status: response.status,
        dataLength: Array.isArray(data) ? data.length : 'not an array',
        firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
      });
      return true;
    } else {
      console.error('[HealthCheck] ❌ Backend returned error:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('[HealthCheck] ❌ Backend health check failed:', error);
    return false;
  }
}

// Add to window for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testNetworkConnectivity = testNetworkConnectivity;
  (window as any).testBackendHealth = testBackendHealth;
}