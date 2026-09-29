import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the dev server (started automatically, or reused if running).
 * Set PW_CHANNEL=chrome to drive your installed Chrome instead of Playwright's Chromium, and
 * E2E_PORT=3100 (for example) when another app already uses port 3000.
 */
const port = Number(process.env.E2E_PORT) || 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    ...devices["Pixel 7"],
    channel: process.env.PW_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: `${baseURL}/login`,
    env: { PORT: String(port) },
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
