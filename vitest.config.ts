import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e-tests/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      // Measured baseline at the end of Phase 0 (2026-08-05): lines 10.41, branches 6.81,
      // functions 7.35, statements 10.92. Thresholds sit just under those numbers so the
      // build fails on regression. Ratchet upward as coverage improves; never lower them.
      thresholds: {
        lines: 10,
        functions: 7,
        branches: 6,
        statements: 10,
      },
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/tests/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
})
