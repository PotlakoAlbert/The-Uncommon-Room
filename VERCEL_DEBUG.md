# Vercel Deployment Configuration

## Issues Fixed

### 1. SPA Routing Issue ✅
**Problem**: Direct navigation to routes like `/admin/login`, `/products`, etc. returned 404 errors
**Root Cause**: Vercel was trying to find physical files instead of serving the SPA
**Solution**: Updated `vercel.json` with proper rewrites configuration

### 2. API Proxy Configuration ✅
**Problem**: API calls from frontend were not reaching Railway backend
**Root Cause**: Missing API proxy configuration in Vercel
**Solution**: Added API rewrites to proxy requests to Railway

### 3. Environment Variable URL Construction ✅
**Problem**: Double `/api` in URLs causing 404s
**Root Cause**: VITE_API_URL configuration inconsistency
**Solution**: Robust URL construction handling both configurations

## Current Configuration

### vercel.json
```json
{
  "buildCommand": "cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://web-production-b8bea.up.railway.app/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### How It Works
1. **API Requests**: `/api/*` → Proxied to Railway backend
2. **All Other Routes**: `/*` → Served `index.html` (SPA routing)
3. **Direct Navigation**: Works for all routes (`/admin/login`, `/products`, etc.)

## Environment Variables
Set in Vercel dashboard:
- `VITE_API_URL` = `https://web-production-b8bea.up.railway.app` (without `/api`)

## Testing URLs
All these should now work:
- ✅ `https://the-uncommon-room-duyr.vercel.app/`
- ✅ `https://the-uncommon-room-duyr.vercel.app/products`
- ✅ `https://the-uncommon-room-duyr.vercel.app/admin/login`
- ✅ `https://the-uncommon-room-duyr.vercel.app/register`
- ✅ API calls proxied to Railway backend