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
      // Measured at the end of Phase 0: statements 11.55, branches 8.62, functions 8.01,
      // lines 12.07. Thresholds sit just under those numbers so the build fails on
      // regression. Ratchet upward as coverage improves; never lower them.
      thresholds: {
        statements: 11,
        branches: 8,
        functions: 8,
        lines: 12,
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
