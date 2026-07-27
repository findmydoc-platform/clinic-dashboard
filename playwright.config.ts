import { defineConfig, devices } from "@playwright/test"

const testDashboardPassword = "clinic-dashboard-test"
const e2ePort = Number(process.env.CLINIC_DASHBOARD_E2E_PORT ?? "3100")
const e2eOrigin = `http://127.0.0.1:${e2ePort}`

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: {
    baseURL: e2eOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${e2ePort}`,
    env: {
      CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
      CLINIC_DASHBOARD_TEST_PASSWORD: testDashboardPassword,
      CSRF_SIGNING_SECRET: "controlled-csrf-secret-32-bytes-minimum",
      DASHBOARD_ORIGIN: e2eOrigin,
      EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
      PAYLOAD_API_URL: "https://preview.findmydoc.eu",
      SUPABASE_PUBLISHABLE_KEY: "controlled-publishable-key",
      SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
    },
    reuseExistingServer: false,
    timeout: 180_000,
    url: e2eOrigin,
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
