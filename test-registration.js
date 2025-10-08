// Simple test to diagnose the registration API issue
console.log('[Test] Testing Railway backend registration API...');

const testRegistration = async () => {
  const testData = {
    name: "Test User",
    email: "test123@example.com",
    password: "testpass123",
    phone: "+27123456789",
    address: "123 Test Street"
  };

  try {
    console.log('[Test] Sending registration request with data:', {
      ...testData,
      password: '[REDACTED]'
    });

    const response = await fetch('https://web-production-b8bea.up.railway.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('[Test] Response status:', response.status);
    console.log('[Test] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[Test] Raw response:', responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log('[Test] Parsed response:', responseJson);
    } catch (e) {
      console.log('[Test] Could not parse response as JSON');
    }

  } catch (error) {
    console.error('[Test] Request failed:', error);
  }
};

testRegistration();