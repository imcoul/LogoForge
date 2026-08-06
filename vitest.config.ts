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
      // Measured after the Phase 1 SVG engine landed: statements 13.67, branches 10.9,
      // functions 9.14, lines 14.07. Thresholds sit just under those numbers so the build
      // fails on regression. Ratchet upward as coverage improves; never lower them.
      thresholds: {
        statements: 13,
        branches: 10,
        functions: 9,
        lines: 14,
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
