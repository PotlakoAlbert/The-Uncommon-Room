// Specific network test for Vercel deployment issues
export async function vercelNetworkDiagnostic() {
  console.log('[VercelTest] Starting Vercel-specific network diagnostic...');
  
  // Test 1: Basic fetch API availability
  console.log('[VercelTest] Testing fetch API availability...');
  console.log('[VercelTest] fetch is available:', typeof fetch !== 'undefined');
  console.log('[VercelTest] window is available:', typeof window !== 'undefined');
  console.log('[VercelTest] location is available:', typeof location !== 'undefined');
  
  if (typeof location !== 'undefined') {
    console.log('[VercelTest] Current location:', {
      href: location.href,
      origin: location.origin,
      protocol: location.protocol,
      hostname: location.hostname,
    });
  }

  // Test 2: Simple same-origin request (should work)
  try {
    console.log('[VercelTest] Testing same-origin request...');
    const response = await fetch('/vite.svg', { method: 'HEAD' });
    console.log('[VercelTest] ✅ Same-origin request works:', response.status);
  } catch (error) {
    console.error('[VercelTest] ❌ Same-origin request failed:', error);
  }

  // Test 3: Test HTTPS external request
  try {
    console.log('[VercelTest] Testing HTTPS external request (httpbin.org)...');
    const response = await fetch('https://httpbin.org/json', {
      method: 'GET',
      mode: 'cors',
    });
    const data = await response.json();
    console.log('[VercelTest] ✅ External HTTPS request works:', data);
  } catch (error) {
    console.error('[VercelTest] ❌ External HTTPS request failed:', error);
    if (error instanceof Error) {
      console.error('[VercelTest] Error type:', error.constructor.name);
      console.error('[VercelTest] Error message:', error.message);
    }
  }

  // Test 4: Test Railway backend specifically
  try {
    console.log('[VercelTest] Testing Railway backend...');
    const backendUrl = 'https://web-production-b8bea.up.railway.app/api/products';
    
    // Test with different fetch options
    const options = {
      method: 'GET',
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials,
      headers: {
        'Accept': 'application/json',
      },
    };
    
    console.log('[VercelTest] Fetch options:', options);
    console.log('[VercelTest] Backend URL:', backendUrl);
    
    const response = await fetch(backendUrl, options);
    
    console.log('[VercelTest] ✅ Railway backend response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    const data = await response.json();
    console.log('[VercelTest] ✅ Railway backend data preview:', {
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'not an array',
      firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null,
    });
    
  } catch (error) {
    console.error('[VercelTest] ❌ Railway backend request failed:', error);
    console.error('[VercelTest] Error details:', {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
    });
  }

  console.log('[VercelTest] Diagnostic complete');
}

// Make it available globally for manual testing
if (typeof window !== 'undefined') {
  (window as any).vercelNetworkDiagnostic = vercelNetworkDiagnostic;
}