import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["agent/tests/**/*.test.ts"],
    testTimeout: 30000,
  },
});
