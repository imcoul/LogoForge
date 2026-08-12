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
      // Measured after the dead-code sweep: statements 16.49, branches 15.0,
      // functions 13.82, lines 16.49. Thresholds sit just under those numbers so the build
      // fails on regression. Ratchet upward as coverage improves; never lower them.
      thresholds: {
        statements: 16,
        branches: 14,
        functions: 13,
        lines: 16,
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
