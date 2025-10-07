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

function createPool() {
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
      params.set('pool_timeout', '10');
    }

    // Update URL with parameters
    dbUrl.search = params.toString();
    
    return new Pool({
      connectionString: dbUrl.toString(),
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 20000,
      max: 10,
      allowExitOnIdle: true
    });
  } catch (error) {
    console.error('Error configuring database connection:', error);
    throw error;
  }
}

// Create the connection pool
const pool = createPool();

// Initialize Drizzle with the connection pool
export const db = drizzle(pool, { schema });

// Test the connection
pool.connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
  });