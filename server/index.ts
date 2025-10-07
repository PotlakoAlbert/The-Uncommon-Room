import express, { type Request, Response, NextFunction, type Express } from "express";
import { registerRoutes } from "./routes";
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const isDevelopment = process.env.NODE_ENV === 'development';
const log = console.log;

// Initialize development dependencies
async function initDevDependencies(app: Express) {
  if (isDevelopment) {
    try {
      const { setupVite, serveStatic } = await import('./vite');
      const server = await import('http').then(http => http.createServer(app));
      await setupVite(app, server);
      serveStatic(app);
      return server;
    } catch (error) {
      console.error('Failed to initialize development dependencies:', error);
      throw error;
    }
  }
  return await import('http').then(http => http.createServer(app));
}

// Set up dirname for ESM
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

// Load environment variables in development
if (isDevelopment) {
  config({ path: resolve(_dirname, '..', '.env') });
}

// Debug environment variables
console.log('Server startup environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL_SET: !!process.env.DATABASE_URL,
  DATABASE_URL_TYPE: typeof process.env.DATABASE_URL,
  ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('DATABASE')),
});

// Test database initialization
async function testDatabase() {
  try {
    const { getDb } = await import('./db.js');
    const db = await getDb();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use((req, res, next) => {
  // Replace with your Vercel frontend URL
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://uncommon-furniture.vercel.app',
    'https://the-uncommon-room.vercel.app',
    'https://the-uncommon-room-duyr.vercel.app'
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test database connection first
  await testDatabase();
  
  // Simple health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({ 
      message: 'UncommonFurniture API Server',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  });

  await registerRoutes(app);
  const server = await initDevDependencies(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
