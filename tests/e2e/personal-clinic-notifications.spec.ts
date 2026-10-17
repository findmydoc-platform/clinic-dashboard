import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page
    .context()
    .addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: page.url() }])
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await Promise.all([
    page.waitForURL(/\/clinics\/controlled-clinic/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ])
}
async function switchClinic(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(name) }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
}

test("attributes the complete personal feed and continues independently of the selected clinic", async ({
  page,
}) => {
  await signIn(page)
  const first = await page.request.get("/api/notifications?mode=page&view=unread")
  expect(first.status()).toBe(200)
  expect(first.headers()["cache-control"]).toContain("no-store")
  const feed = await first.json()
  expect(feed.unreadCount).toBe(32)
  expect(feed.items).toHaveLength(25)
  expect(new Set(feed.items.map((item: { clinic: { id: string } }) => item.clinic.id)).size).toBe(2)
  await page.getByRole("button", { name: "Notifications, 32 unread notifications" }).click()
  const dialog = page.getByRole("dialog", { name: "Notifications" })
  await expect(dialog.getByText("Controlled Clinic", { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText("Second Controlled Clinic", { exact: true }).first()).toBeVisible()
  await dialog.getByRole("button", { name: "Close notifications" }).click()
  await switchClinic(page, "Second Controlled Clinic")
  const next = await page.request.get(
    `/api/notifications?mode=page&view=unread&cursor=${encodeURIComponent(feed.nextCursor)}`,
  )
  expect(next.status()).toBe(200)
  const continuation = await next.json()
  expect(continuation.items).toHaveLength(7)
  expect(continuation).not.toHaveProperty("unreadCount")
  expect(
    continuation.items.every(
      (item: { clinic: { id: string } }) => item.clinic.id === "controlled-second-clinic",
    ),
  ).toBe(true)
  await expect(page.getByRole("button", { name: "Notifications, 32 unread notifications" })).toBeVisible()
})

test("clears the old center during switching and drops a delayed personal-feed completion", async ({
  page,
}) => {
  await signIn(page)
  let release!: () => void
  let finished!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const completed = new Promise<void>((resolve) => {
    finished = resolve
  })
  let intercepted = false
  await page.route("**/api/notifications?mode=page&view=unread", async (route) => {
    if (intercepted) return route.continue()
    intercepted = true
    const response = await route.fetch()
    const body = await response.json()
    body.items[0].clinic.name = "Obsolete clinic response"
    await held
    try {
      await route.fulfill({ response, json: body })
    } catch {
      /* Navigation may abort the obsolete request. */
    }
    finished()
  })
  await page.getByRole("button", { name: /Notifications, 32 unread/ }).click()
  await expect.poll(() => intercepted).toBe(true)
  await page
    .getByRole("dialog", { name: "Notifications" })
    .getByRole("button", { name: "Close notifications" })
    .click()
  await switchClinic(page, "Second Controlled Clinic")
  release()
  await completed
  await expect(page.getByRole("dialog", { name: "Notifications" })).not.toBeVisible()
  await page.getByRole("button", { name: /Notifications, 32 unread/ }).click()
  await expect(page.getByText("Obsolete clinic response")).toHaveCount(0)
  await expect(
    page
      .getByRole("dialog", { name: "Notifications" })
      .getByText("Second Controlled Clinic", { exact: true })
      .first(),
  ).toBeVisible()
})

test("hides personal feed and count after known access loss", async ({ page }) => {
  await signIn(page)
  await page.route("**/api/notifications?mode=page&view=unread", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      headers: { "X-Findmydoc-Clinic-Notifications-Support": "clinic-notifications-v1" },
      json: { contractVersion: "clinic-notifications-v1", error: { code: "CLINIC_ACCESS_DENIED" } },
    }),
  )
  await page.getByRole("button", { name: /Notifications, 32 unread/ }).click()
  await expect(page.getByText("Notifications are unavailable for your current clinic access.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Notifications, count unavailable" })).toBeVisible()
  await expect(page.getByRole("list", { name: "Notifications" })).toHaveCount(0)
})

test("marks a fixed displayed selection across clinics once and preserves receipts after switching", async ({
  page,
}) => {
  await signIn(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const writes: string[][] = []
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
      writes.push(request.postDataJSON().notificationIds)
  })
  await page.getByRole("button", { name: /Notifications, 32 unread/ }).click()
  const dialog = page.getByRole("dialog", { name: "Notifications" })
  await expect(dialog.getByRole("button", { name: "Mark 25 shown as read" })).toBeEnabled()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await expect(dialog.getByText("Controlled Clinic", { exact: true }).first()).toBeVisible()
  await expect(dialog.getByText("Second Controlled Clinic", { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: "output/playwright/237/personal-feed-mobile-light.png" })
  await dialog.getByRole("button", { name: "Close notifications" }).click()
  await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: /Notifications, 32 unread/ }).click()
  await expect(dialog.getByRole("button", { name: "Mark 25 shown as read" })).toBeEnabled()
  await page.screenshot({ path: "output/playwright/237/personal-feed-mobile-dark.png" })
  await dialog.getByRole("button", { name: "Mark 25 shown as read" }).click()
  await expect(dialog.getByText("Marked as read.", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Notifications, 7 unread notifications" })).toBeVisible()
  expect(writes).toHaveLength(1)
  expect(writes[0]).toHaveLength(25)
  expect(writes[0]).toContain("controlled-notification-0")
  expect(writes[0]).toContain("controlled-notification-24")
  await dialog.getByRole("button", { name: "Close notifications" }).click()
  await switchClinic(page, "Second Controlled Clinic")
  await expect(page.getByRole("button", { name: "Notifications, 7 unread notifications" })).toBeVisible()
})
