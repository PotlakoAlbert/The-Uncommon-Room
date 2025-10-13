import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from 'dotenv';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  config();
}

// Set database URL fallback
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  console.log('⚠️  DATABASE_URL not found, using fallback in db.ts');
}

// Configure Neon with WebSocket for serverless environment
// Try HTTP-based connection first for stability
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true; // Force secure WebSocket
neonConfig.poolQueryViaFetch = true; // Use fetch for queries when possible
// Disable pipelining for stability
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

async function createPool(): Promise<Pool> {
  let DATABASE_URL = process.env.DATABASE_URL;

  // Double-check fallback (should be set by now)
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL still not found, applying final fallback');
    DATABASE_URL = 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  }

  // Debug logging
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_SET: !!DATABASE_URL,
    DATABASE_URL_LENGTH: DATABASE_URL?.length || 0,
    DATABASE_URL_STARTS_WITH: DATABASE_URL?.substring(0, 15) || 'N/A'
  });

  // Check for placeholder values that might come from build process
  if (DATABASE_URL === 'placeholder-for-runtime' || DATABASE_URL === 'undefined' || DATABASE_URL === 'null') {
    throw new Error("DATABASE_URL contains placeholder value. Check Railway environment variables configuration.");
  }

  try {
    // Validate database URL format
    const dbUrl = new URL(DATABASE_URL);
    
    // Verify required components
    if (!dbUrl.protocol.startsWith('postgres')) {
      throw new Error('Database URL must start with postgres:// or postgresql://');
    }
    if (!dbUrl.username) {
      throw new Error('Database URL must include username');
    }
    if (!dbUrl.hostname) {
      throw new Error('Database URL must include hostname');
    }
    if (!dbUrl.pathname || dbUrl.pathname === '/') {
      throw new Error('Database URL must include database name');
    }

    // Add required parameters if missing
    const params = new URLSearchParams(dbUrl.search);
    if (!params.has('sslmode')) {
      params.set('sslmode', 'require');
    }
    if (!params.has('pool_timeout')) {
      params.set('pool_timeout', '30');
    }
    // Set explicit connect timeout
    if (!params.has('connect_timeout')) {
      params.set('connect_timeout', '10');
    }

    // Update URL with parameters
    dbUrl.search = params.toString();
    
    // Create pool with retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const pool = new Pool({
          connectionString: dbUrl.toString(),
          ssl: {
            rejectUnauthorized: false
          },
          connectionTimeoutMillis: 30000, // 30 seconds
          idleTimeoutMillis: 120000, // 2 minutes (increased)
          max: 3, // Reduce max connections for serverless (reduced further)
          allowExitOnIdle: true,
          keepAlive: true,
          // Add query timeout
          query_timeout: 30000,
          // Add statement timeout
          statement_timeout: 30000,
        });

        // Test connection before returning pool
        await pool.connect();
        console.log('Database connection test successful');
        return pool;
      } catch (err) {
        console.error(`Connection attempt ${attempt} failed:`, err);
        if (attempt === 3) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('Failed to create pool after all attempts');
  } catch (error) {
    console.error('Error configuring database connection:', error);
    throw error;
  }
}

// Immediate initialization with error handling
let poolInstance: Pool;
let dbInstance: any;

async function initializeDatabase() {
  if (poolInstance && dbInstance) {
    return { pool: poolInstance, db: dbInstance };
  }

  try {
    poolInstance = await createPool();
    dbInstance = drizzle(poolInstance, { 
      schema,
      logger: process.env.NODE_ENV !== 'production'
    });
    
    console.log('✅ Database initialized successfully');
    return { pool: poolInstance, db: dbInstance };
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// Initialize immediately
const dbPromise = initializeDatabase();

// Export synchronous db and pool for backwards compatibility
export let db: any;
export let pool: Pool;

// Initialize and set the exports
dbPromise.then(({ db: initializedDb, pool: initializedPool }) => {
  db = initializedDb;
  pool = initializedPool;
}).catch(error => {
  console.error('Database initialization failed:', error);
  // Set a proxy that will retry initialization on each use
  db = new Proxy({} as any, {
    get(target, prop) {
      throw new Error(`Database not initialized: ${String(prop)}. Original error: ${error.message}`);
    }
  });
});

// Export functions for explicit initialization
export async function getDb() {
  const { db } = await dbPromise;
  return db;
}

export async function getPool() {
  const { pool } = await dbPromise;
  return pool;
}