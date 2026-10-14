import { expect, test } from "@playwright/test"

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing cross-app acceptance value: ${name}`)
  return value
}

const controlOrigin = required("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN")
const controlToken = required("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")

test("shows a committed inquiry within one minute and refreshes every loaded page", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)
  const controlHeaders = { Authorization: `Bearer ${controlToken}` }
  await page.goto("/")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()
  const notificationBell = page.getByRole("button", { name: /^Notifications, \d+ unread notification/ })
  await expect(notificationBell).toBeVisible()
  const initialLabel = await notificationBell.getAttribute("aria-label")
  const baselineCount = Number(initialLabel?.match(/^Notifications, (\d+) unread notification/)?.[1])
  expect(Number.isSafeInteger(baselineCount)).toBe(true)

  const first = await request.post(`${controlOrigin}/create-notification-inquiry`, {
    headers: controlHeaders,
  })
  expect(first.ok()).toBe(true)
  const firstSource = (await first.json()) as { occurredAt: string }
  const firstCommittedAt = Date.parse(firstSource.occurredAt)
  expect(Number.isFinite(firstCommittedAt)).toBe(true)
  await expect(notificationBell).toHaveAttribute(
    "aria-label",
    new RegExp(`^Notifications, ${baselineCount + 1} unread notifications?$`),
    { timeout: 60_000 },
  )
  const firstDisplayMs = Date.now() - firstCommittedAt
  expect(firstDisplayMs).toBeLessThan(60_000)
  for (let index = 0; index < 25; index++) {
    const created = await request.post(`${controlOrigin}/create-notification-inquiry`, {
      headers: controlHeaders,
    })
    expect(created.ok()).toBe(true)
  }
  await expect(notificationBell).toHaveAttribute(
    "aria-label",
    `Notifications, ${baselineCount + 26} unread notifications`,
    { timeout: 60_000 },
  )
  await notificationBell.click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  const items = center.locator('ul[aria-label="Notifications"] > li')
  await expect(items).toHaveCount(25)
  await expect(center.getByRole("button", { name: "Load more" })).toBeVisible({ timeout: 60_000 })
  await center.getByRole("button", { name: "Load more" }).click()
  await expect(items).toHaveCount(baselineCount + 26)

  const newest = await request.post(`${controlOrigin}/create-notification-inquiry`, {
    headers: controlHeaders,
  })
  expect(newest.ok()).toBe(true)
  const newestSource = (await newest.json()) as { occurredAt: string }
  const newestCommittedAt = Date.parse(newestSource.occurredAt)
  expect(Number.isFinite(newestCommittedAt)).toBe(true)
  await expect(notificationBell).toHaveAttribute(
    "aria-label",
    `Notifications, ${baselineCount + 27} unread notifications`,
    { timeout: 60_000 },
  )
  await expect(items).toHaveCount(baselineCount + 27, { timeout: 60_000 })
  const loadedDisplayMs = Date.now() - newestCommittedAt
  expect(loadedDisplayMs).toBeLessThan(60_000)
  console.info(JSON.stringify({ event: "notification_cross_app_freshness", firstDisplayMs, loadedDisplayMs }))
  await page.screenshot({ path: "output/playwright/notification-208-live-refresh.png", fullPage: true })
})
