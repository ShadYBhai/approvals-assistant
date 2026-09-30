import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      // Use import.meta.url (ESM-safe) instead of __dirname
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Resolve workspace package to TypeScript source directly (no build step needed)
      '@approvals/contracts': fileURLToPath(
        new URL('../../packages/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
});
