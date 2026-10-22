import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// JSX is compiled by esbuild with the automatic runtime. (@vitejs/plugin-react resolves a different
// vite major than vitest in this workspace, so it is not needed for tests.)
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    restoreMocks: true,
  },
});
