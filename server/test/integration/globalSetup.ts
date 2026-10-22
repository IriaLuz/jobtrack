import { execSync } from "node:child_process";

/** Runs once before all integration tests: checks we point at a test database, then migrates it. */
export default function setup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set. See server/.env.test.");

  // The tests delete every row between runs, so never let them touch a real database.
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to run integration tests against "${databaseName}": the name must end with _test.`);
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}
