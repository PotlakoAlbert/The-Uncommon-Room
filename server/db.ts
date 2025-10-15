import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { config } from 'dotenv';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  config();
}

// Set database URL fallback
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('⚠️  DATABASE_URL not found, using fallback in db.ts');
}

// Configure based on environment
const USE_STANDARD_PG = process.env.NODE_ENV === 'development';

if (!USE_STANDARD_PG) {
  // Production: Use Neon serverless with simplified configuration
  neonConfig.webSocketConstructor = undefined;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchConnectionCache = false;
  neonConfig.pipelineConnect = false;
  neonConfig.pipelineTLS = false;
  
  console.log('🔧 Using Neon serverless driver for production');
} else {
  console.log('🔧 Using standard PostgreSQL driver for development');
}

async function createPool(): Promise<NeonPool | PgPool> {
  let DATABASE_URL = process.env.DATABASE_URL;

  // Double-check fallback (should be set by now)
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL still not found, applying final fallback');
    DATABASE_URL = 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  }

  // Check for placeholder values that might come from build process
  if (DATABASE_URL === 'placeholder-for-runtime' || DATABASE_URL === 'undefined' || DATABASE_URL === 'null') {
    throw new Error("DATABASE_URL contains placeholder value. Check Railway environment variables configuration.");
  }

  // First try the Neon serverless driver 
  try {
    console.log('🧪 Trying Neon serverless driver...');
    
    const neonPool = new NeonPool({
      connectionString: DATABASE_URL,
    });

    // Test the connection
    const client = await neonPool.connect();
    await client.query('SELECT 1');
    client.release();
    
    console.log('✅ Neon serverless driver connected successfully');
    return neonPool;
  } catch (neonError) {
    console.warn('⚠️ Neon serverless driver failed:', String(neonError));
    
    // Fallback to standard PostgreSQL driver
    try {
      console.log('🔄 Trying standard PostgreSQL driver...');
      
      const pgPool = new PgPool({
        connectionString: DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 1,
        allowExitOnIdle: true,
      });

      // Test the connection
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ Standard PostgreSQL driver connected successfully');
      return pgPool;
    } catch (pgError) {
      console.error('❌ Both drivers failed');
      console.error('Neon error:', String(neonError));
      console.error('PG error:', String(pgError));
      throw pgError;
    }
  }
}

// Immediate initialization with error handling
let poolInstance: NeonPool | PgPool;
let dbInstance: any;

async function initializeDatabase() {
  if (poolInstance && dbInstance) {
    return { pool: poolInstance, db: dbInstance };
  }

  try {
    poolInstance = await createPool();
    
    // Handle different pool types for drizzle
    if (poolInstance instanceof NeonPool) {
      dbInstance = drizzle(poolInstance, { 
        schema,
        logger: process.env.NODE_ENV !== 'production'
      });
    } else {
      // For standard PG pool, we need to use a different drizzle adapter
      const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
      dbInstance = drizzlePg(poolInstance, { 
        schema,
        logger: process.env.NODE_ENV !== 'production'
      });
    }
    
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
export let pool: NeonPool | PgPool;

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