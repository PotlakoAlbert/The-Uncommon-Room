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
const definedEnvVars = {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  // Use placeholder for DATABASE_URL during build if not available
  'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL || 'placeholder-for-runtime'),
  'process.env.FRONTEND_URL': JSON.stringify(process.env.FRONTEND_URL || ''),
  'process.env.CORS_ORIGIN': JSON.stringify(process.env.CORS_ORIGIN || '*'),
  'process.env.PORT': JSON.stringify(process.env.PORT || '5000'),
  'process.env.JWT_SECRET': JSON.stringify(process.env.JWT_SECRET || 'placeholder-for-runtime'),
  'process.env.SESSION_SECRET': JSON.stringify(process.env.SESSION_SECRET || 'placeholder-for-runtime'),
  // Add explicit check for DATABASE_URL
  'global.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL || 'placeholder-for-runtime'),
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

          // Runtime environment variable validation
          process.on('beforeExit', () => {
            // Only validate in production (Railway)
            if (process.env.NODE_ENV === 'production') {
              const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'SESSION_SECRET'];
              const missing = requiredVars.filter(v => !process.env[v]);
              
              if (missing.length > 0) {
                console.error('Missing required environment variables:', missing.join(', '));
                process.exit(1);
              }
            }
          });
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