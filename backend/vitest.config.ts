import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // src/index.ts is the server bootstrap (listen only): it never runs
      // under tests, so it is the one file excluded from coverage.
      // *.types.ts files contain only TypeScript interfaces — they emit no
      // JavaScript at all, so there is nothing for coverage to measure.
      exclude: ["src/index.ts", "src/**/*.types.ts", "dist/**"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
