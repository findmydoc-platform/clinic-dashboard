import { expect, test, type Page, type BrowserContext } from "@playwright/test"

async function setClinicSet(context: BrowserContext, baseURL: string, value: "many" | "empty") {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value, url: baseURL }])
}
async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
}
async function switchClinic(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(name) }).click()
}

test("fresh personal clinic list scopes reporting and keeps the selected section", async ({
  page,
  context,
  baseURL,
}) => {
  await setClinicSet(context, baseURL!, "many")
  await signIn(page)
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=dashboard$/)
  const bootstrap = await page.request.get("/api/dashboard/bootstrap")
  expect(bootstrap.headers()["cache-control"]).toContain("no-store")
  expect(await bootstrap.json()).toMatchObject({
    schemaVersion: "clinic-scope-v1",
    clinics: [{ id: "controlled-clinic" }, { id: "controlled-second-clinic" }],
  })
  await expect(
    page.getByRole("region", { name: "Dashboard metrics" }).getByText("284", { exact: true }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
  await expect(page.getByText("The profile for this clinic is currently unavailable.")).toBeVisible()
  await switchClinic(page, "Second Controlled Clinic")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByRole("button", { name: "Clinic profile", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await page.getByRole("button", { name: "Dashboard", exact: true }).click()
  await expect(
    page.getByRole("region", { name: "Dashboard metrics" }).getByText("109", { exact: true }),
  ).toBeVisible()
  const forbidden = await page.request.get("/api/dashboard/clinics/foreign-clinic/reporting?periodDays=30")
  expect(forbidden.status()).toBe(403)
  expect(forbidden.headers()["cache-control"]).toContain("private")
  expect(await forbidden.json()).toEqual({ code: "REPORTING_ACCESS_DENIED" })
  const legacy = await page.request.get("/api/dashboard/reporting?periodDays=30")
  expect(legacy.status()).toBe(403)
})

test("restores only a fresh authorized preference and explains unavailable previous clinics", async ({
  page,
  context,
  baseURL,
}) => {
  await setClinicSet(context, baseURL!, "many")
  await context.addCookies([
    {
      name: "fmd-clinic-preference",
      value: encodeURIComponent(
        JSON.stringify({ principalId: "controlled-clinic-staff", clinicId: "controlled-second-clinic" }),
      ),
      url: baseURL!,
    },
  ])
  await signIn(page)
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
  await context.addCookies([
    {
      name: "fmd-clinic-preference",
      value: encodeURIComponent(
        JSON.stringify({ principalId: "controlled-clinic-staff", clinicId: "foreign-clinic" }),
      ),
      url: baseURL!,
    },
  ])
  await page.goto("/")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=dashboard&selection=fallback$/)
  await expect(
    page.getByText(
      "Your previous clinic is no longer available. The first currently authorized clinic is open.",
    ),
  ).toBeVisible()
})

test("zero clinics restrict the workspace and one clinic has no switching control", async ({
  page,
  context,
  baseURL,
}) => {
  await signIn(page)
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toHaveCount(0)
  await setClinicSet(context, baseURL!, "empty")
  await page.goto("/")
  await expect(page).toHaveURL(/\/access$/)
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  const bootstrap = await page.request.get("/api/dashboard/bootstrap")
  expect(await bootstrap.json()).toMatchObject({ schemaVersion: "clinic-scope-v1", clinics: [] })
})

test("replaces old reporting state and rejects a delayed old-clinic response", async ({
  page,
  context,
  baseURL,
}) => {
  await setClinicSet(context, baseURL!, "many")
  await signIn(page)
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
  const oldReporting = await (
    await page.request.get("/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7")
  ).json()
  let oldResponded = false
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let oldRequested = false
  expect((await page.request.get("/api/dashboard/reviews")).status()).toBe(403)
  expect((await page.request.get("/api/dashboard/clinics/controlled-clinic/reviews")).status()).toBe(200)
  expect((await page.request.get("/api/dashboard/inquiries")).status()).toBe(404)
  expect((await page.request.get("/api/dashboard/clinics/controlled-clinic/inquiries")).status()).toBe(200)
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", async (route) => {
    oldRequested = true
    await held
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...oldReporting,
          metrics: {
            ...oldReporting.metrics,
            profileViews: {
              ...oldReporting.metrics.profileViews,
              current: { state: "available", value: 99999 },
            },
          },
        }),
      })
    } catch {
      /* The old context may already have cancelled this request. */
    }
    oldResponded = true
  })
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect.poll(() => oldRequested).toBe(true)
  await switchClinic(page, "Second Controlled Clinic")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
  await expect(
    page.getByRole("region", { name: "Dashboard metrics" }).getByText("109", { exact: true }),
  ).toBeVisible()
  release()
  await expect.poll(() => oldResponded).toBe(true)
  await expect(page.getByText("99999", { exact: true })).toHaveCount(0)
})

test("denied active reads hide clinic content and foreign page targets never fall back", async ({
  page,
  context,
  baseURL,
}) => {
  await setClinicSet(context, baseURL!, "many")
  await signIn(page)
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toBeVisible()
  expect((await page.request.get("/api/dashboard/reviews")).status()).toBe(403)
  expect((await page.request.get("/api/dashboard/clinics/controlled-clinic/reviews")).status()).toBe(200)
  expect((await page.request.get("/api/dashboard/inquiries")).status()).toBe(404)
  expect((await page.request.get("/api/dashboard/clinics/controlled-clinic/inquiries")).status()).toBe(200)
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "REPORTING_ACCESS_DENIED" }),
    }),
  )
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await expect(page.getByRole("region", { name: "Dashboard metrics" })).toHaveCount(0)
  await page.goto("/clinics/foreign-clinic")
  await expect(page).toHaveURL(/\/access\?state=restricted$/)
  await expect(
    page.getByRole("button", { name: /Current clinic location|Switch clinic location/ }),
  ).toHaveCount(0)
})

test("authorized selector works with keyboard and fits narrow screens in both themes", async ({
  page,
  context,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: "light" })
  await setClinicSet(context, baseURL!, "many")
  await signIn(page)
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Switch clinic location/ }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("menu", { name: /Switch clinic location/ })).toBeVisible()
  await expect(page.getByRole("menuitem", { name: /Controlled Clinic/, exact: false }).first()).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: "output/playwright/230/selector-mobile-light.png" })
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toBeFocused()
  await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await expect(page.getByRole("menu", { name: /Switch clinic location/ })).toBeVisible()
  await page.screenshot({ path: "output/playwright/230/selector-mobile-dark.png" })
  await expect(page.getByRole("menuitem", { name: "Controlled Clinic", exact: true })).toBeFocused()
  await page.keyboard.press("End")
  await expect(page.getByRole("menuitem", { name: "Second Controlled Clinic", exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
})

test("unconverted domain routes remain closed and a reporting outage preserves the session", async ({
  page,
  context,
}) => {
  await signIn(page)
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
  for (const domain of ["profile", "gallery", "clinic-treatments"]) {
    const legacy = await page.request.get(`/api/dashboard/${domain}`)
    expect(legacy.status()).toBe(403)
    const scoped = await page.request.get(`/api/dashboard/clinics/controlled-clinic/${domain}`)
    expect(scoped.status()).toBe(404)
  }
  expect((await page.request.get("/api/dashboard/reviews")).status()).toBe(403)
  expect((await page.request.get("/api/dashboard/clinics/controlled-clinic/reviews")).status()).toBe(200)
  expect((await page.request.get("/api/dashboard/inquiries")).status()).toBe(404)
  expect((await page.request.get("/api/dashboard/clinics/controlled-clinic/inquiries")).status()).toBe(200)
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "REPORTING_SERVICE_UNAVAILABLE" }),
    }),
  )
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect(page.getByText("Reporting is temporarily unavailable.")).toBeVisible()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  expect(
    (await context.cookies()).some((cookie) => cookie.name === "clinic_dashboard_controlled_session"),
  ).toBe(true)
})
