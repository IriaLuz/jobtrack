import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

// E2E runs its own API and web server on dedicated ports, so it never reuses (or clashes with)
// the dev servers you may have running on 3000 and 5173.
const API_URL = "http://localhost:3100";
const WEB_URL = "http://localhost:4173";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: WEB_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // The real API and database. AI is switched off on purpose: the journey must work without it.
      command: "npm run start --prefix server",
      url: `${API_URL}/api/health`,
      env: { PORT: "3100", GROQ_API_KEY: "" },
    },
    {
      // The production build, served with the same /api proxy as in development.
      command: "npm run build && npm run preview -- --port 4173 --strictPort",
      url: WEB_URL,
      env: { API_PROXY_TARGET: API_URL },
    },
  ],
});
