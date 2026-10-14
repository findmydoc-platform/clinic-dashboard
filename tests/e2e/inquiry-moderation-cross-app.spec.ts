import { expect, test } from "@playwright/test"

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing cross-app value: ${name}`)
  return value
}
const controlUrl = new URL(required("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN"))
if (
  controlUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(controlUrl.hostname) ||
  controlUrl.pathname !== "/" ||
  controlUrl.username ||
  controlUrl.password ||
  controlUrl.search ||
  controlUrl.hash
)
  throw new Error("Expected an exact isolated control origin")
const control = controlUrl.origin
const controlHeaders = { Authorization: `Bearer ${required("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")}` }
const inquiryId = required("INQUIRY_ACCEPTANCE_INQUIRY_ID")

test("renders authorized restriction, restoration and final appeal from real source commands", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto("/")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("button", { name: /Notifications,.*unread/ })).toBeVisible()
  const start = Date.now()
  const restricted = await request.post(`${control}/notification-restrict-inquiry`, {
    headers: controlHeaders,
  })
  expect(restricted.status()).toBe(200)
  const restrictedSource = await restricted.json()
  const member = restrictedSource.items.find(
    (item: { members: Array<{ eventType: string }> }) => item.members[0]?.eventType === "inquiry_restricted",
  ).members[0]
  await page.getByRole("button", { name: /Notifications,.*unread/ }).click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  await expect(center.getByRole("button", { name: "Open Inquiry restricted from Ada Patient" })).toBeVisible({
    timeout: 60_000,
  })
  expect(Date.now() - start).toBeLessThan(60_000)
  await page.screenshot({ fullPage: true, path: "output/playwright/206-restriction-desktop.png" })
  const opened = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/inquiries/detail" &&
      response.request().method() === "GET",
  )
  await center.getByRole("button", { name: "Open Inquiry restricted from Ada Patient" }).click()
  expect((await opened).status()).toBe(200)
  await expect(page.getByRole("region", { name: "Inquiry from Ada Patient" })).toBeVisible()
  await expect
    .poll(async () => {
      const marked = await page.evaluate(async () =>
        (await fetch("/api/notifications?mode=page&view=all", { cache: "no-store" })).json(),
      )
      return marked.items
        .flatMap((item: { members: unknown[] }) => item.members)
        .find((item: { notificationId: string }) => item.notificationId === member.notificationId)?.readAt
    })
    .toEqual(expect.any(String))
  const final = await request.post(`${control}/notification-overturn-inquiry`, { headers: controlHeaders })
  expect(final.status()).toBe(200)
  const finalSource = await final.json()
  expect(
    finalSource.items
      .map((item: { members: Array<{ eventType: string }> }) => item.members[0]?.eventType)
      .sort(),
  ).toEqual(["inquiry_appeal_decided", "inquiry_created", "inquiry_restored", "inquiry_restricted"])
  expect(JSON.stringify(finalSource)).not.toMatch(
    /Private (moderation reason|report description|appeal text|final reason)/u,
  )
  await page.getByRole("button", { name: /Notifications,.*unread/ }).click()
  await expect(center.getByText("Inquiry restored", { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(center.getByText("Restriction lifted", { exact: true })).toBeVisible()
  await expect(center.getByText("Inquiry restricted", { exact: true })).not.toBeVisible()
  await page.setViewportSize({ width: 320, height: 568 })
  await page.screenshot({ fullPage: true, path: "output/playwright/206-final-mobile.png" })
  await center.getByRole("button", { name: "Close notifications" }).click()
  await page.getByRole("button", { name: /Open account menu for/ }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: /Notifications,.*unread/ }).click()
  await expect(center.getByText("Restriction lifted", { exact: true })).toBeVisible()
  await page.screenshot({ fullPage: true, path: "output/playwright/206-final-dark-mobile.png" })
  const current = await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=all", { cache: "no-store" })).json(),
  )
  expect(
    current.items.every(
      (item: { destination: { inquiryId?: string } }) => item.destination.inquiryId === inquiryId,
    ),
  ).toBe(true)
})
