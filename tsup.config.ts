import { readFileSync } from 'fs';
import { defineConfig } from 'tsup';

// Single source of truth for the CLI's `nodecrypt version` output: `npm version` bumps package.json.
const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  shims: true,
  define: {
    __NODECRYPT_VERSION__: JSON.stringify(version),
  },
});
