import { expect, test, type Page } from "@playwright/test"
import { controlledEmailCallbackPath } from "../fixtures/controlled-email-callback"

async function completeInvitation(page: Page) {
  await page.goto(controlledEmailCallbackPath("invite"))
  await page.getByRole("button", { name: "Continue invitation" }).click()
  await expect(page).toHaveURL(/\/auth\/invite\/complete$/)
  await page.getByLabel("Password", { exact: true }).fill("new-password")
  await page.getByLabel("Confirm password").fill("new-password")
  await page.getByRole("button", { name: "Save password" }).click()
  await expect(page).toHaveURL(/\/login\?status=invite-complete$/)
}
async function signIn(page: Page) {
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
}

test("personal invitation completes before a fresh clinic-set bootstrap opens authorized group reporting", async ({
  page,
  context,
  baseURL,
}) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.setViewportSize({ width: 375, height: 812 })
  await completeInvitation(page)
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "clinic_dashboard_completion_grant"),
  ).toBe(false)
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "clinic_dashboard_controlled_session"),
  ).toBe(false)
  await signIn(page)
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=dashboard$/)
  const bootstrap = await page.request.get("/api/dashboard/bootstrap")
  expect(bootstrap.headers()["cache-control"]).toContain("no-store")
  expect(await bootstrap.json()).toMatchObject({
    schemaVersion: "clinic-scope-v1",
    clinics: [{ id: "controlled-clinic" }, { id: "controlled-second-clinic" }],
  })
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toBeVisible()
  expect(
    (await page.request.get("/api/dashboard/clinics/foreign-clinic/reporting?periodDays=30")).status(),
  ).toBe(403)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "output/playwright/group-access/2181/activated-mobile.png" })
  expect(runtimeErrors).toEqual([])
})

test("completed personal invitation preserves an empty eligible clinic set as restricted workspace", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "empty", url: baseURL! }])
  await completeInvitation(page)
  await signIn(page)
  await expect(page).toHaveURL(/\/access$/)
  expect(await (await page.request.get("/api/dashboard/bootstrap")).json()).toMatchObject({
    schemaVersion: "clinic-scope-v1",
    clinics: [],
  })
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/group-access/2181/empty-clinic-set.png" })
})

test("missing and expired invitation grants cannot complete a password or open the restricted workspace", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "clinic_dashboard_controlled_access_state", value: "denied", url: baseURL! },
  ])
  await page.goto("/auth/invite/complete")
  await expect(page.getByRole("button", { name: "Save password" })).toHaveCount(0)
  await page.goto(controlledEmailCallbackPath("invite"))
  await page.getByRole("button", { name: "Continue invitation" }).click()
  await expect(page).toHaveURL(/\/auth\/invite\/complete$/)
  await context.clearCookies({ name: "clinic_dashboard_completion_grant" })
  await page.getByLabel("Password", { exact: true }).fill("new-password")
  await page.getByLabel("Confirm password").fill("new-password")
  await page.getByRole("button", { name: "Save password" }).click()
  await expect(page).not.toHaveURL(/status=invite-complete/)
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  const denied = await page.request.get("/api/dashboard/bootstrap")
  expect(denied.status()).toBe(403)
  expect(await denied.json()).toMatchObject({ code: "CLINIC_DASHBOARD_ACCESS_DENIED" })
})
