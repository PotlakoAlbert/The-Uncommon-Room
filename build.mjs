import * as esbuild from 'esbuild';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

async function ensureDirectory(filepath) {
  try {
    await mkdir(dirname(filepath), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function build() {
  try {
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
        // Database drivers
        'pg-native',
        'sqlite3',
        'mysql',
        'tedious'
      ],
      banner: {
        js: `
          // ESM module compatibility
          const loadESMModules = async () => {
            try {
              const { createRequire } = await import('module');
              const { fileURLToPath } = await import('url');
              const { dirname } = await import('path');
              
              const require = createRequire(import.meta.url);
              const __filename = fileURLToPath(import.meta.url);
              const __dirname = dirname(__filename);
              
              globalThis.require = require;
              globalThis.__filename = __filename;
              globalThis.__dirname = __dirname;
            } catch (error) {
              console.error('Failed to set up ESM compatibility:', error);
              process.exit(1);
            }
          };
          
          await loadESMModules();
        `,
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