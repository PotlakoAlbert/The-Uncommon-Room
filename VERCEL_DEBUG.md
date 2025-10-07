# Environment Variables Configuration

## Current Issue
The registration is failing because the URL is being constructed as:
`https://web-production-b8bea.up.railway.app/api/api/auth/register` (double `/api`)

## Root Cause
Vercel environment variable `VITE_API_URL` is probably still set to include `/api` suffix.

## Solution

### Option 1: Fix Vercel Environment Variable (Recommended)
In your Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Set `VITE_API_URL` to: `https://web-production-b8bea.up.railway.app`
4. Remove any trailing `/api` from the value
5. Redeploy

### Option 2: Code Already Handles Both Cases
The updated code now strips `/api` from the baseURL automatically, so it should work regardless of how the environment variable is set.

## Testing URLs
With the fix, both of these configurations should work:

**Configuration A (Recommended):**
- `VITE_API_URL=https://web-production-b8bea.up.railway.app`
- Results in: `https://web-production-b8bea.up.railway.app/api/auth/register` ✅

**Configuration B (Legacy - now handled):**
- `VITE_API_URL=https://web-production-b8bea.up.railway.app/api`
- Code strips `/api` and results in: `https://web-production-b8bea.up.railway.app/api/auth/register` ✅

## Debug Information
The browser console will now show:
- Base URL from environment
- Request URL path
- Final constructed URL

Check these logs to verify the URL construction is working correctly.