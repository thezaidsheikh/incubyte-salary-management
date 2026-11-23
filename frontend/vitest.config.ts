import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest config: jsdom environment for React component tests, v8 coverage.
 * `src/app/layout.tsx` is excluded — it is untestable Next.js boilerplate
 * (root layout with metadata + static nav), not application logic.
 */
export default defineConfig({
  esbuild: {
    // tsconfig uses jsx: "preserve" (Next.js style); tests need the
    // automatic runtime so JSX works without importing React.
    jsx: "automatic",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    // Lets @testing-library/react auto-clean up the DOM between tests.
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/app/layout.tsx", "src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
