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
      DASHBOARD_PASSWORD: testDashboardPassword,
      NEXT_PUBLIC_DEPLOYMENT_ENV: "preview",
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
