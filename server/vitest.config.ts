import { defineConfig } from "vitest/config";

// Unit tests: domain and HTTP pieces in isolation. No database, no network.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
