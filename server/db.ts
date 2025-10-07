import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from 'dotenv';

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  config();
}

// Configure Neon with WebSocket for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true; // Force secure WebSocket

async function createPool(): Promise<Pool> {
  let DATABASE_URL = process.env.DATABASE_URL;

  // Fallback to static URL if environment variable is not set (Railway deployment issue)
  if (!DATABASE_URL) {
    console.warn('DATABASE_URL not found in environment variables, using fallback URL');
    DATABASE_URL = process.env.FALLBACK_DATABASE_URL || 'postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
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
          idleTimeoutMillis: 60000, // 1 minute
          max: 5, // Reduce max connections for serverless
          allowExitOnIdle: true,
          keepAlive: true,
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

// Lazy initialization for the connection pool
let pool: Pool | null = null;
let drizzleDb: any = null;

async function initializeDatabase() {
  if (pool && drizzleDb) {
    return { pool, db: drizzleDb };
  }

  try {
    pool = await createPool();
    drizzleDb = drizzle(pool, { 
      schema,
      logger: process.env.NODE_ENV !== 'production'
    });
    
    return { pool, db: drizzleDb };
  } catch (error) {
    console.error('Failed to create database pool:', error);
    throw error;
  }
}

// Export lazy-initialized database connection
export async function getDb() {
  const { db } = await initializeDatabase();
  return db;
}

export async function getPool() {
  const { pool } = await initializeDatabase();
  return pool;
}

// For backwards compatibility, export a promise-based db
export const db = {
  async query(...args: any[]) {
    const database = await getDb();
    return database.query(...args);
  },
  async select(...args: any[]) {
    const database = await getDb();
    return database.select(...args);
  },
  async insert(...args: any[]) {
    const database = await getDb();
    return database.insert(...args);
  },
  async update(...args: any[]) {
    const database = await getDb();
    return database.update(...args);
  },
  async delete(...args: any[]) {
    const database = await getDb();
    return database.delete(...args);
  },
  get transaction() {
    return async (callback: any) => {
      const database = await getDb();
      return database.transaction(callback);
    };
  }
};