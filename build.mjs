import * as esbuild from 'esbuild';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

async function ensureDirectory(filepath) {
  try {
    await mkdir(dirname(filepath), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// Define environment variables that should be available at runtime
// Only define NODE_ENV at build time, let Railway handle runtime env vars
const definedEnvVars = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  // Add fallback DATABASE_URL for Railway deployment issues
  'process.env.FALLBACK_DATABASE_URL': JSON.stringify('postgresql://neondb_owner:npg_iqRAj4Yl8XyN@ep-lingering-king-ad0o3wyd-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'),
};

async function build() {
  try {
    // In production (Railway), we'll get env vars at runtime, so skip validation during build
    if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
      console.warn('Warning: DATABASE_URL not set during build. Will be required at runtime.');
    }

    // Ensure api directory exists
    await ensureDirectory('api/index.mjs');

    // Build the server
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node18',
      outfile: 'api/index.mjs',
      sourcemap: true,
      minify: process.env.NODE_ENV === 'production',
      define: definedEnvVars,
      external: [
        // Native Node.js modules
        'path',
        'fs',
        'url',
        'module',
        // External packages that cause issues
        '@babel/preset-typescript',
        '@babel/preset-typescript/package.json',
        'lightningcss/node',
        '../pkg',
        '../lightningcss.*.node',
        // Native modules
        'bcrypt',
        'ws',
        // Database drivers
        'pg-native',
        'sqlite3',
        'mysql',
        'tedious'
      ],
      banner: {
        js: `
          // ESM module compatibility
          import { createRequire } from 'module';
          import { fileURLToPath } from 'url';
          import { dirname } from 'path';
          
          const require = createRequire(import.meta.url);
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
          
          globalThis.require = require;
          globalThis.__filename = __filename;
          globalThis.__dirname = __dirname;
        `
      },
    });

    // Create function.json for Azure Functions (if needed)
    const functionJson = {
      "bindings": [
        {
          "authLevel": "anonymous",
          "type": "httpTrigger",
          "direction": "in",
          "name": "req",
          "methods": ["get", "post", "put", "delete"],
          "route": "{*route}"
        },
        {
          "type": "http",
          "direction": "out",
          "name": "res"
        }
      ]
    };

    // Write function.json
    await writeFile('api/function.json', JSON.stringify(functionJson, null, 2));

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

build().catch(error => {
  console.error('Unhandled build error:', error);
  process.exit(1);
});