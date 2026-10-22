import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    exclude: ['src/app/app.spec.ts', 'src/app/shared/ui/skeleton-layout.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
    css: true,
  },
});
