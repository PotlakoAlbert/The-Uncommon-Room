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

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set in environment variables.",
  );
}

// Create connection pool with improved configuration
const pool = new Pool({ 
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? true : undefined,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  max: 20,
});

// Initialize Drizzle with the connection pool
export const db = drizzle(pool, { schema });

// Test the connection
pool.connect().then(() => {
  console.log('Successfully connected to database');
}).catch((err) => {
  console.error('Failed to connect to database:', err);
});