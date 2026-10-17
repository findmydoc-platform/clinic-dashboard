import { expect, test } from "@playwright/test"

test("submits recovery once and preserves the inquiry destination", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "clinic_dashboard_controlled_session", value: "controlled-clinic-staff", url: baseURL! },
  ])
  let posts = 0
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/session/recover" && request.method() === "POST")
      posts += 1
  })
  await page.goto("/auth/session/recover?next=%2F%3Finquiry%3Dinquiry-lukas-weber&mode=refresh")
  await expect.poll(() => new URL(page.url()).pathname).toBe("/clinics/controlled-clinic")
  expect(new URL(page.url()).searchParams.get("inquiry")).toBe("inquiry-lukas-weber")
  await expect(page.getByRole("heading", { name: "Inquiries", exact: true })).toBeVisible()
  expect(posts).toBe(1)
})

test("recovery form works without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    await context.addCookies([
      { name: "clinic_dashboard_controlled_session", value: "controlled-clinic-staff", url: baseURL! },
    ])
    const page = await context.newPage()
    await page.goto("/auth/session/recover?next=%2F&mode=refresh")
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible()
    const submitted = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/auth/session/recover" &&
        response.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Continue", exact: true }).click()
    const recovered = await submitted
    expect(recovered.status()).toBe(303)
    const destination = new URL(recovered.headers()["location"]!)
    expect(destination.pathname).toBe("/")
    expect(Boolean(destination.searchParams.get("sessionRecovery"))).toBe(true)
    await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=dashboard$/u)
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
  } finally {
    await context.close()
  }
})

test("recovery loading state supports light, dark and narrow screens", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await context.addCookies([
      { name: "clinic_dashboard_controlled_session", value: "controlled-clinic-staff", url: baseURL! },
    ])
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/auth/session/recover?next=%2F&mode=refresh", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("status")).toHaveText("Please wait while we check your session.")
    await page.screenshot({ path: "output/playwright/session-recovery-light.png" })
    await page.evaluate(() => document.documentElement.classList.add("dark"))
    await page.screenshot({ path: "output/playwright/session-recovery-dark.png" })
    await page.setViewportSize({ width: 320, height: 568 })
    await expect(page.getByRole("heading", { name: "Opening your dashboard" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: "output/playwright/session-recovery-mobile.png" })
  } finally {
    await context.close()
  }
})

test("JavaScript-free recovery retains its signed attempt on an explicit clinic target", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  try {
    await context.addCookies([
      { name: "clinic_dashboard_controlled_session", value: "controlled-clinic-staff", url: baseURL! },
    ])
    const page = await context.newPage()
    const target = "/clinics/controlled-clinic?section=dashboard"
    await page.goto(`/auth/session/recover?next=${encodeURIComponent(target)}&mode=refresh`)
    await page.getByRole("button", { name: "Continue", exact: true }).click()
    await expect.poll(() => new URL(page.url()).pathname).toBe("/clinics/controlled-clinic")
    expect(new URL(page.url()).searchParams.get("section")).toBe("dashboard")
    expect(Boolean(new URL(page.url()).searchParams.get("sessionRecovery"))).toBe(true)
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible()
  } finally {
    await context.close()
  }
})
