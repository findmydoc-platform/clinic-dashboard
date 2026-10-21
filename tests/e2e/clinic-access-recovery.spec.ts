import { expect, test } from "@playwright/test"

test("confirmed active access loss hides content and waits for an explicit alternative", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await Promise.all([
    page.waitForURL(/\/clinics\/controlled-clinic\?section=dashboard$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ])
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toBeVisible()
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "REPORTING_ACCESS_DENIED" }),
    }),
  )
  const deniedResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/clinics/controlled-clinic/reporting" &&
      new URL(response.url()).searchParams.get("periodDays") === "7",
  )
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  const denied = await deniedResponse
  expect(denied.status()).toBe(403)
  expect(await denied.finished()).toBeNull()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=dashboard$/)
  await expect(
    page.getByRole("region", { name: "Dashboard metrics" }).getByText("109", { exact: true }),
  ).toBeVisible()
})

test("decline keeps a dirty lost-clinic draft restricted; confirmation opens a clean inquiry workspace", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("button", { name: "Inquiries", exact: true }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const detail = page.getByRole("region", { name: "Inquiry from Lukas Weber" })
  await detail
    .getByRole("textbox", { name: "Reply to patient" })
    .fill("Private original clinic work must not be silently discarded.")
  await page.route("**/api/dashboard/clinics/controlled-clinic/inquiries/messages", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "access-denied" } }),
    }),
  )
  await detail.getByRole("button", { name: "Send reply" }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(page.getByText("Private original clinic work must not be silently discarded.")).toHaveCount(0)
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const confirmation = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole("button", { name: "Stay restricted" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await confirmation.getByRole("button", { name: "Discard and open clinic" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=messages$/)
  await page.getByRole("button", { name: /Second clinic Lukas Weber/ }).click()
  await expect(page.getByRole("textbox", { name: "Reply to patient" })).toHaveValue("")
  await expect(page.getByText("Private original clinic work must not be silently discarded.")).toHaveCount(0)
})

test("fresh approved empty choices keep clinic work restricted without ending the valid session", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toBeVisible()
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
  const deniedReporting = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/clinics/controlled-clinic/reporting" &&
      new URL(response.url()).searchParams.get("periodDays") === "7",
  )
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "empty", url: baseURL! }])
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  const denied = await deniedReporting
  expect(denied.status()).toBe(403)
  expect(denied.headers()["cache-control"]).toContain("no-store")
  await expect(
    page.getByText("No other clinics are currently available. Clinic work remains restricted."),
  ).toBeVisible()
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  await expect(
    page.getByRole("region", { name: "Clinic access has changed" }).getByRole("button", { name: /^Open / }),
  ).toHaveCount(0)
  const bootstrap = await page.request.get("/api/dashboard/bootstrap")
  expect(bootstrap.status()).toBe(200)
  expect(bootstrap.headers()["cache-control"]).toContain("no-store")
  expect(await bootstrap.json()).toMatchObject({ schemaVersion: "clinic-scope-v1", clinics: [] })
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "clinic_dashboard_controlled_session"),
  ).toBe(true)
})

test("a temporary choices outage preserves restriction and session until an explicit retry and choice", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toBeVisible()
  await page.route("**/api/dashboard/bootstrap", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE" }),
    }),
  )
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "REPORTING_ACCESS_DENIED" }),
    }),
  )
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect(page.getByText("Clinic choices are temporarily unavailable. Try again.")).toBeVisible()
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "clinic_dashboard_controlled_session"),
  ).toBe(true)
  await page.unroute("**/api/dashboard/bootstrap")
  await page.getByRole("button", { name: "Refresh clinic choices" }).click()
  await expect(page.getByRole("button", { name: "Open Second Controlled Clinic" })).toBeVisible()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
})

for (const theme of ["light", "dark"] as const) {
  test(`restricted recovery and discard remain keyboard reachable at 320px in ${theme}`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const runtimeErrors: string[] = []
    page.on("pageerror", (error) => runtimeErrors.push(error.name))
    await page.setViewportSize({ width: 320, height: 800 })
    await page.emulateMedia({ colorScheme: theme })
    await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
    await page.goto("/login")
    await page.getByLabel("Email address").fill("clinic-staff@example.com")
    await page.getByLabel("Password").fill("clinic-dashboard-test")
    await page.getByRole("button", { name: "Sign in" }).click()
    await page.getByRole("button", { name: "Open navigation" }).click()
    await page.getByRole("button", { name: "Inquiries", exact: true }).click()
    await page.getByRole("button", { name: /Lukas Weber/ }).click()
    await page.getByRole("textbox", { name: "Reply to patient" }).fill("Synthetic privately retained draft")
    await page.route("**/api/dashboard/clinics/controlled-clinic/inquiries/messages", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "access-denied" } }),
      }),
    )
    await page.getByRole("button", { name: "Send reply" }).click()
    const heading = page.getByRole("heading", { name: "Clinic access has changed" })
    await expect(heading).toBeFocused()
    await expect(page.getByRole("button", { name: "Open Second Controlled Clinic" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`recovery-${theme}-320.png`),
      fullPage: true,
      style: "nextjs-portal {visibility:hidden}",
    })
    await page.keyboard.press("Tab")
    await expect(page.getByRole("button", { name: "Open Second Controlled Clinic" })).toBeFocused()
    await page.keyboard.press("Enter")
    const dialog = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole("button", { name: "Stay restricted" })).toBeFocused()
    await expect(dialog).toHaveCSS("opacity", "1")
    await page.screenshot({
      path: testInfo.outputPath(`discard-${theme}-320.png`),
      animations: "disabled",
      fullPage: true,
      style: "nextjs-portal {visibility:hidden}",
    })
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Open Second Controlled Clinic" })).toBeFocused()
    await expect(
      page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
    ).toBeVisible()
    expect(runtimeErrors).toEqual([])
  })
}

test("a delayed old reporting response cannot restore inaccessible content or enter the chosen clinic", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toBeVisible()
  const sourceReport = await page.request.get(
    "/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7",
  )
  expect(sourceReport.status()).toBe(200)
  const report = await sourceReport.json()
  let release!: () => void
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false,
    finished = false
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", async (route) => {
    requested = true
    await hold
    await route
      .fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...report,
          metrics: {
            ...report.metrics,
            profileViews: { ...report.metrics.profileViews, current: { state: "available", value: 99999 } },
          },
        }),
      })
      .catch(() => {})
    finished = true
  })
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect.poll(() => requested).toBe(true)
  await page.getByRole("button", { name: "Inquiries", exact: true }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  await page.getByRole("textbox", { name: "Reply to patient" }).fill("Synthetic old clinic work")
  await page.route("**/api/dashboard/clinics/controlled-clinic/inquiries/messages", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "access-denied" } }),
    }),
  )
  await page.getByRole("button", { name: "Send reply" }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  release()
  await expect.poll(() => finished).toBe(true)
  await expect(page.getByText("99999", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await page.getByRole("button", { name: "Discard and open clinic" }).click()
  await expect(page).toHaveURL(/controlled-second-clinic\?section=messages$/)
  await page.getByRole("button", { name: "Dashboard", exact: true }).click()
  await expect(
    page.getByRole("region", { name: "Dashboard metrics" }).getByText("109", { exact: true }),
  ).toBeVisible()
  await expect(page.getByText("99999", { exact: true })).toHaveCount(0)
})
