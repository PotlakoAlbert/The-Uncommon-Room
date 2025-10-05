import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  try {
    // Build the server
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node18',
      outfile: 'api/index.mjs',
      external: [
        '@babel/preset-typescript',
        '@babel/preset-typescript/package.json',
        'lightningcss/node',
        '../pkg',
        '../lightningcss.*.node'
      ],
      banner: {
        js: `
          import { createRequire } from 'module';
          import { fileURLToPath } from 'url';
          import { dirname } from 'path';
          const require = createRequire(import.meta.url);
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = dirname(__filename);
        `,
      },
    });

    // Create function.json
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
    process.exit(1);
  }
}

build();