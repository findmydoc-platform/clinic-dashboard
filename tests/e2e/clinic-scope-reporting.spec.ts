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

test("keeps reporting selections through section navigation and document reload", async ({
  page,
  context,
  baseURL,
}) => {
  const hydrationErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|server rendered/i.test(message.text()))
      hydrationErrors.push(message.text())
  })
  await setClinicSet(context, baseURL!, "many")
  await signIn(page)
  const period = page.getByRole("group", { name: "Reporting period", exact: true })
  const profileViews = page.locator('[data-funnel-stage="profileViews"]')
  const inquiries = page.locator('[data-funnel-stage="inquiries"]')
  await expect(period.getByRole("button", { name: "30 days", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(profileViews).toHaveAttribute("aria-pressed", "true")
  await period.getByRole("button", { name: "90 days", exact: true }).click()
  await inquiries.click()
  await page.getByRole("button", { name: "Reviews", exact: true }).click()
  await page.getByRole("button", { name: "Dashboard", exact: true }).click()
  await expect(inquiries).toHaveAttribute("aria-pressed", "true")
  await expect(period.getByRole("button", { name: "90 days", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await expect(page.getByRole("button", { name: "Profile views 902" })).toBeVisible()
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=90", async (route) => {
    await pending
    await route.continue()
  })
  const restored = page.waitForResponse((response) =>
    response.url().endsWith("/api/dashboard/clinics/controlled-clinic/reporting?periodDays=90"),
  )
  restored.catch(() => undefined)
  await page.reload()
  await expect(period.getByRole("button", { name: "90 days", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(inquiries).toHaveAttribute("aria-pressed", "true")
  await expect(profileViews).toContainText("Loading")
  await expect(page.getByRole("button", { name: "Profile views 284" })).toHaveCount(0)
  release()
  expect((await restored).status()).toBe(200)
  await expect(page.getByRole("button", { name: "Profile views 902" })).toBeVisible()
  expect(hydrationErrors).toEqual([])
  await page.screenshot({ path: "output/playwright/reporting-selection-reloaded.png", fullPage: true })

  await switchClinic(page, "Second Controlled Clinic")
  await expect(period.getByRole("button", { name: "30 days", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(profileViews).toHaveAttribute("aria-pressed", "true")
})

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
  await expect(page.getByRole("button", { name: "Profile views 284" })).toBeVisible()
  await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Clinic profile", exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Clinic image gallery" })).toBeVisible()
  await switchClinic(page, "Second Controlled Clinic")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByRole("button", { name: "Clinic profile", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  )
  await page.getByRole("button", { name: "Dashboard", exact: true }).click()
  await expect(page.getByRole("button", { name: "Profile views 109" })).toBeVisible()
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
  expect((await page.request.get("/api/dashboard/clinic-treatments")).status()).toBe(404)
  expect(
    (await page.request.get("/api/dashboard/clinics/controlled-clinic/clinic-treatments")).status(),
  ).toBe(200)
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
  await expect(page.getByRole("button", { name: "Profile views 109" })).toBeVisible()
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
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
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
  for (const domain of ["profile", "inquiries", "reviews"]) {
    const legacy = await page.request.get(`/api/dashboard/${domain}`)
    expect([403, 404]).toContain(legacy.status())
    const scoped = await page.request.get(`/api/dashboard/clinics/controlled-clinic/${domain}`)
    expect(scoped.status()).toBe(200)
  }
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

test("keeps three overview cards and independent Payload facts through an analytics outage", async ({
  page,
}) => {
  await signIn(page)
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
  const stages = page.getByRole("list", { name: "Conversion stages" })
  await expect(stages.locator("[data-funnel-stage]")).toHaveCount(5)
  expect(
    await stages
      .locator("[data-funnel-stage]")
      .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-funnel-stage"))),
  ).toEqual(["impressions", "profileViews", "uniqueVisitors", "inquiryStarters", "inquiries"])
  const metrics = page.getByRole("region", { name: "Dashboard metrics" })
  await expect(metrics.getByText("Public profile completion", { exact: true })).toBeVisible()
  await expect(metrics.getByText("Content to be defined", { exact: true })).toHaveCount(2)
  await expect(stages.locator('[data-funnel-stage="profileViews"]')).toHaveAttribute("aria-pressed", "true")

  for (const [id, label] of [
    ["impressions", "Impressions"],
    ["profileViews", "Profile views"],
    ["uniqueVisitors", "Unique visitors"],
    ["inquiryStarters", "Inquiry starters"],
    ["inquiries", "Inquiries"],
  ]) {
    const card = stages.locator(`[data-funnel-stage="${id}"]`)
    await card.focus()
    await page.keyboard.press("Enter")
    await expect(card).toBeFocused()
    await expect(card).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("heading", { level: 2, name: label, exact: true })).toBeVisible()
    if (id === "impressions")
      await expect(page.getByText("Incomplete data coverage", { exact: true })).toBeVisible()
  }

  const reporting = await (
    await page.request.get("/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7")
  ).json()
  const unavailable = {
    current: { state: "source_unavailable", value: null },
    comparison: { state: "source_unavailable", value: null, absoluteDelta: null, relativeDeltaPercent: null },
    source: "posthog",
  }
  await page.route("**/api/dashboard/clinics/controlled-clinic/reporting?periodDays=7", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...reporting,
        metrics: {
          ...reporting.metrics,
          impressions: unavailable,
          profileViews: unavailable,
          uniqueVisitors: unavailable,
          inquiryStarters: unavailable,
        },
      }),
    }),
  )
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect(stages.getByRole("button", { name: "Profile views Not available", exact: true })).toBeVisible()
  await expect(stages.locator('[data-funnel-stage="inquiries"]')).toHaveAttribute("aria-pressed", "true")
  await expect(stages.getByRole("button", { name: "Inquiries 7", exact: true })).toBeVisible()
  await stages.locator('[data-funnel-stage="profileViews"]').click()
  await expect(page.getByText("Data source unavailable", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Profile views 71", exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Public profile progress", exact: true })).toBeVisible()
  await expect(page.getByText("4.8 / 5", { exact: true })).toBeVisible()
  await expect(metrics.getByText("Content to be defined", { exact: true })).toHaveCount(2)
  await page.screenshot({ path: "output/playwright/305-five-card-analytics-outage.png", fullPage: true })
})

test("inquiry starters restores legacy preferences and stays usable with keyboard, touch and both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signIn(page)
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard", exact: true })).toBeVisible()
  await page.evaluate(() =>
    sessionStorage.setItem(
      "fmd-dashboard-reporting-selection",
      JSON.stringify({
        scope: "controlled-clinic-staff:controlled-clinic",
        periodDays: 90,
        metricId: "contacts",
      }),
    ),
  )
  await page.reload()
  await expect(page.locator('[data-funnel-stage="profileViews"]')).toHaveAttribute("aria-pressed", "true")
  await page.getByRole("button", { name: "7 days", exact: true }).click()
  await expect(page.getByRole("button", { name: "Profile views 71", exact: true })).toBeVisible()
  const starters = page.locator('[data-funnel-stage="inquiryStarters"]')
  await starters.focus()
  await page.keyboard.press("Enter")
  await expect(starters).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("heading", { level: 2, name: "Inquiry starters", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "90 days", exact: true }).click()
  await page.getByRole("button", { name: "Reviews", exact: true }).click()
  await page.getByRole("button", { name: "Dashboard", exact: true }).click()
  await page.reload()
  await expect(starters).toHaveAttribute("aria-pressed", "true")
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 760 })
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme })
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/)
      await page.evaluate(() => {
        ;(document.activeElement as HTMLElement | null)?.blur()
        window.scrollTo(0, 0)
      })
      await page.screenshot({
        path: `output/playwright/302-inquiry-starters-${theme}-${width}.png`,
        fullPage: true,
      })
      await page.getByRole("button", { name: "About Inquiry starters details", exact: true }).click()
      const explanation = page.getByRole("dialog", { name: "About Inquiry starters details", exact: true })
      await expect(explanation).toContainText("once per clinic and period")
      await expect(explanation).toContainText("Unique Visitors")
      const bounds = await explanation.boundingBox()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      expect(bounds!.y).toBeGreaterThanOrEqual(0)
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(width === 1440 ? 1000 : 760)
      await page.screenshot({ path: `output/playwright/302-inquiry-starters-info-${theme}-${width}.png` })
      await page.keyboard.press("Escape")
      await expect(explanation).not.toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
  }
  expect(errors).toEqual([])
})

test.describe("inquiry starter touch explanation", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 320, height: 500 } })
  test("selects inquiry starters and dismisses its explanation by touch", async ({ page }, testInfo) => {
    await signIn(page)
    const starters = page.locator('[data-funnel-stage="inquiryStarters"]')
    await starters.tap()
    await expect(starters).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: "About Inquiry starters details", exact: true }).tap()
    const explanation = page.getByRole("dialog", { name: "About Inquiry starters details", exact: true })
    await expect(explanation).toContainText("invalid, cleared and later submitted input")
    const content = explanation.getByText(
      "Values require complete history; comparison coverage is separate.",
      {
        exact: false,
      },
    )
    await expect(content).toBeVisible()
    await expect
      .poll(() =>
        explanation.evaluate((element) => {
          const bounds = element.getBoundingClientRect()
          const maxHeight = Number.parseFloat(getComputedStyle(element).maxHeight)
          return (
            maxHeight > 0 &&
            element.clientHeight > 0 &&
            bounds.width > 0 &&
            bounds.height > 0 &&
            bounds.x >= 0 &&
            bounds.right <= window.innerWidth &&
            bounds.y >= 0 &&
            bounds.bottom <= window.innerHeight
          )
        }),
      )
      .toBe(true)
    const bounds = await explanation.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(500)
    expect((await content.boundingBox())!.y).toBeGreaterThanOrEqual(bounds!.y)
    const overflows = await explanation.evaluate((element) => element.scrollHeight > element.clientHeight)
    if (overflows) {
      await explanation.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await expect
        .poll(() =>
          explanation.evaluate((element) =>
            Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop),
          ),
        )
        .toBeLessThanOrEqual(1)
      expect(await explanation.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
    }
    const contentBounds = await content.boundingBox()
    expect(contentBounds!.y + contentBounds!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height)
    await page.screenshot({ path: testInfo.outputPath("302-inquiry-starters-touch-320.png") })
    await page.getByRole("button", { name: "Close explanation" }).tap()
    await expect(explanation).not.toBeVisible()
  })
})
