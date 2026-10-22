import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    exclude: ['src/app/app.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
  },
});
