import { defineConfig, devices } from "@playwright/test"

const testDashboardPassword = "clinic-dashboard-test"

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --port 3100",
    env: {
      CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
      CLINIC_DASHBOARD_TEST_PASSWORD: testDashboardPassword,
      CSRF_SIGNING_SECRET: "controlled-csrf-secret-32-bytes-minimum",
      DASHBOARD_ORIGIN: "http://127.0.0.1:3100",
      PAYLOAD_API_URL: "https://preview.findmydoc.eu",
      SUPABASE_PUBLISHABLE_KEY: "controlled-publishable-key",
      SUPABASE_URL: "https://controlled-staging.supabase.co",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    url: "http://127.0.0.1:3100",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
})
