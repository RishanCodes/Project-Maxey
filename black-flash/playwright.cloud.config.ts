import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

/** End-to-end tests against a local Supabase-compatible stack (scripts/cloud-stack/up.sh). */
const env: Record<string, string> = Object.fromEntries(
  readFileSync(".env.cloud-test", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const PORT = 3124;
const serverEnv = {
  ...env, NEXT_DIST_DIR: ".next-cloud", ALLOWED_EMAILS: "me@example.com", ANTHROPIC_API_KEY: "test-key-not-used", CRON_SECRET: "cron-test-secret",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: env.VAPID_PUBLIC || "", VAPID_PRIVATE_KEY: env.VAPID_PRIVATE || "", VAPID_SUBJECT: "mailto:test@example.com",
};
export default defineConfig({
  testDir: "tests/e2e-cloud",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: serverEnv,
  },
  projects: [{ name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium", timezoneId: "America/Los_Angeles" } }],
});
