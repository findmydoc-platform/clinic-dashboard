import { defineConfig, devices } from "@playwright/test"

function requiredValue(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing cross-app acceptance value: ${name}`)
  return value
}

function exactLoopbackOrigin(name: string) {
  const value = requiredValue(name)
  const url = new URL(value)
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(`${name} must be an exact local HTTP origin`)
  }
  return url.origin
}

const dashboardPort = Number(process.env.CLINIC_DASHBOARD_CROSS_APP_PORT ?? "3101")
const dashboardOrigin = `http://127.0.0.1:${dashboardPort}`
const websiteOrigin = exactLoopbackOrigin("INQUIRY_ACCEPTANCE_WEBSITE_ORIGIN")
const clinicId = requiredValue("INQUIRY_ACCEPTANCE_CLINIC_ID")
const clinicName = requiredValue("INQUIRY_ACCEPTANCE_CLINIC_NAME")
const clinicToken = requiredValue("INQUIRY_ACCEPTANCE_CLINIC_TOKEN")
const foreignClinicId = requiredValue("INQUIRY_ACCEPTANCE_FOREIGN_CLINIC_ID")
const foreignClinicName = requiredValue("INQUIRY_ACCEPTANCE_FOREIGN_CLINIC_NAME")
const foreignClinicToken = requiredValue("INQUIRY_ACCEPTANCE_FOREIGN_CLINIC_TOKEN")

function dashboardEnvironment(origin: string, id: string, name: string, token: string) {
  return {
    CLINIC_DASHBOARD_AUTH_TEST_MODE: "controlled",
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_ID: id,
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_CLINIC_NAME: name,
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_MODE: "inquiry-communication",
    CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_TOKEN: token,
    CLINIC_DASHBOARD_TEST_PASSWORD: "clinic-dashboard-cross-app",
    CSRF_SIGNING_SECRET: "cross-app-csrf-secret-32-bytes-minimum",
    DASHBOARD_ORIGIN: origin,
    EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    NEXT_PUBLIC_CLINIC_DASHBOARD_LOCAL_ACCEPTANCE: "1",
    PAYLOAD_API_URL: websiteOrigin,
    SUPABASE_PUBLISHABLE_KEY: "cross-app-publishable-key",
    SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  }
}

export default defineConfig({
  forbidOnly: true,
  retries: 0,
  testDir: "./tests/e2e",
  testMatch: "inquiry-cross-app.spec.ts",
  timeout: 90_000,
  use: {
    baseURL: dashboardOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `pnpm dev --port ${dashboardPort}`,
      env: dashboardEnvironment(dashboardOrigin, clinicId, clinicName, clinicToken),
      reuseExistingServer: false,
      timeout: 180_000,
      url: dashboardOrigin,
    },
    {
      command: "pnpm dev --port 3102",
      env: {
        ...dashboardEnvironment(
          "http://127.0.0.1:3102",
          foreignClinicId,
          foreignClinicName,
          foreignClinicToken,
        ),
        CLINIC_DASHBOARD_LOCAL_ACCEPTANCE_DIST_DIR: ".next-cross-app-foreign",
      },
      reuseExistingServer: false,
      timeout: 180_000,
      url: "http://127.0.0.1:3102",
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
