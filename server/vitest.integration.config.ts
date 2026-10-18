import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Loads the test database URL. Variables that are already set (for example in CI) win.
config({ path: ".env.test", quiet: true });

// Integration tests: the real Express app against a real PostgreSQL test database.
export default defineConfig({
  test: {
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["test/integration/globalSetup.ts"],
    // Test files share one database, so they run one after another.
    fileParallelism: false,
  },
});
