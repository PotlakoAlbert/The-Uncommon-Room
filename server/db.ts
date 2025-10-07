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
neonConfig.fetchConnectionCache = true; // Enable connection caching

async function createPool(): Promise<Pool> {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in environment variables.");
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

// Create the connection pool with error handling
let pool: Pool;
try {
  pool = await createPool();
} catch (error) {
  console.error('Failed to create database pool:', error);
  throw error;
}

// Initialize Drizzle with the connection pool
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV !== 'production'
});

// Export pool for potential direct usage
export { pool };