import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Server modules (lib/env.ts, lib/server/*) run in plain Node under Vitest.
      'server-only': fileURLToPath(new URL('./tests/rls/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    exclude: ['tests/rls/**', 'tests/e2e/**'],
  },
});
