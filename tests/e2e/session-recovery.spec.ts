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
  await expect(page).toHaveURL(/\/?\?inquiry=inquiry-lukas-weber$/u)
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
    await page.getByRole("button", { name: "Continue", exact: true }).click()
    await expect(page).toHaveURL(/\/?\?sessionRecovery=.+$/u)
    await expect(page.getByRole("heading", { name: "Reporting", exact: true })).toBeVisible()
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
