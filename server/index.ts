import express, { type Request, Response, NextFunction, type Express } from "express";
import { registerRoutes } from "./routes";
import { config } from 'dotenv';
import { dirname as pathDirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const isDevelopment = process.env.NODE_ENV === 'development';
const log = console.log;

// Initialize development dependencies
async function initDevDependencies(app: Express) {
  if (isDevelopment) {
    try {
      // Dynamic import only in development, won't be bundled in production
      const viteModule = await import('./vite.js').catch(() => null);
      if (viteModule) {
        const { setupVite, serveStatic } = viteModule;
        const server = await import('http').then(http => http.createServer(app));
        await setupVite(app, server);
        serveStatic(app);
        return server;
      }
    } catch (error) {
      console.error('Vite setup failed (continuing without):', error);
    }
  }
  console.log('Creating basic HTTP server (production mode)');
  return await import('http').then(http => http.createServer(app));
}

// Set up dirname for ESM
const _filename = fileURLToPath(import.meta.url);
const _dirname = pathDirname(_filename);

// Load environment variables in development
if (isDevelopment) {
  config({ path: resolve(_dirname, '..', '.env') });
}

// Set fallback environment variables if not provided
const setEnvDefaults = () => {
  // Database Configuration
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    console.log('⚠️  DATABASE_URL not found, using fallback');
  }
  
  // JWT Configuration
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'ad03d779b2e16a187f4a65e2caf2084d89af004c199e6d4624ed9e5babbf8d52138932fc44df7ac6e567055bae52046a7dca26450e78e8ce48e2c43a3043368b';
    console.log('⚠️  JWT_SECRET not found, using fallback');
  }
  
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'bc344e9556bade53e4c06d7c039e7b66529c45f419fe5826f05bb16648c17533198b66d8d0ee081749bccd55f50566120a24931aa2d8a5d3593d685dbfc90128';
    console.log('⚠️  SESSION_SECRET not found, using fallback');
  }
  
  // CORS Configuration
  if (!process.env.CORS_ORIGIN) {
    process.env.CORS_ORIGIN = 'https://the-uncommon-room-duyr.vercel.app';
    console.log('⚠️  CORS_ORIGIN not found, using fallback');
  }
  
  if (!process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL = 'https://the-uncommon-room-duyr.vercel.app';
    console.log('⚠️  FRONTEND_URL not found, using fallback');
  }
  
  // Server Configuration
  if (!process.env.PORT) {
    process.env.PORT = '8080';
  }
  
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
  }
  
  // Email Configuration (if needed)
  if (!process.env.SMTP_HOST) {
    process.env.SMTP_HOST = 'smtp.gmail.com';
  }
  
  if (!process.env.SMTP_PORT) {
    process.env.SMTP_PORT = '587';
  }
  
  if (!process.env.SMTP_USER) {
    process.env.SMTP_USER = 'your_email@gmail.com';
  }
  
  if (!process.env.SMTP_PASS) {
    process.env.SMTP_PASS = 'your_email_password';
  }
};

// Apply environment defaults
setEnvDefaults();

// Debug environment variables
console.log('Server startup environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL_SET: !!process.env.DATABASE_URL,
  DATABASE_URL_TYPE: typeof process.env.DATABASE_URL,
  JWT_SECRET_SET: !!process.env.JWT_SECRET,
  JWT_SECRET_LENGTH: process.env.JWT_SECRET?.length || 0,
  ALL_ENV_KEYS: Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('JWT')),
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
  server.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
  });
})();
