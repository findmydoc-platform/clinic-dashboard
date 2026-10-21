import { expect, test } from "@playwright/test"

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing cross-app acceptance value: ${name}`)
  return value
}

const controlOrigin = required("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN")
const controlToken = required("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")
const websiteOrigin = required("INQUIRY_ACCEPTANCE_WEBSITE_ORIGIN")
const secondToken = required("INQUIRY_ACCEPTANCE_SECOND_CLINIC_TOKEN")
type FeedItem = { kind: string; members: Array<{ notificationId: string }> }
type FeedPage = { unreadCount: number; items: FeedItem[]; nextCursor: string | null }

test("marks only loaded unread entries once and leaves later activity and another reader unread", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)
  const controlHeaders = { Authorization: `Bearer ${controlToken}` }
  for (let index = 0; index < 2; index++)
    expect(
      (await request.post(`${controlOrigin}/create-patient-message`, { headers: controlHeaders })).ok(),
    ).toBe(true)
  for (let index = 0; index < 26; index++)
    expect(
      (await request.post(`${controlOrigin}/create-notification-inquiry`, { headers: controlHeaders })).ok(),
    ).toBe(true)

  await page.goto("/")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("button", { name: "Notifications, 28 unread notifications" }).click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  const initial = (await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=unread", { cache: "no-store" })).json(),
  )) as FeedPage
  expect(initial.unreadCount).toBe(28)
  expect(initial.items).toHaveLength(25)
  expect(initial.items.some((item) => item.kind === "patient_message_group")).toBe(false)
  await expect(center.getByRole("button", { name: "Mark 25 shown as read" })).toBeVisible()

  let releaseWrite: (() => void) | undefined
  let reportSubmission: ((ids: string[]) => void) | undefined
  const heldWrite = new Promise<void>((resolve) => {
    releaseWrite = resolve
  })
  const submitted = new Promise<string[]>((resolve) => {
    reportSubmission = resolve
  })
  await page.route("**/api/notifications/read", async (route) => {
    reportSubmission?.(route.request().postDataJSON().notificationIds as string[])
    await heldWrite
    await route.continue()
  })
  const firstResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications/read" &&
      response.request().method() === "POST",
  )
  await center.getByRole("button", { name: "Mark 25 shown as read" }).click()
  const firstIds = await submitted
  expect(firstIds).toEqual([
    ...new Set(initial.items.flatMap((item) => item.members.map((member) => member.notificationId))),
  ])
  expect(firstIds).toHaveLength(25)
  expect(
    (await request.post(`${controlOrigin}/create-notification-inquiry`, { headers: controlHeaders })).ok(),
  ).toBe(true)
  releaseWrite?.()
  expect((await firstResponse).ok()).toBe(true)
  await page.unroute("**/api/notifications/read")
  await expect(page.getByRole("button", { name: "Notifications, 4 unread notifications" })).toBeVisible()

  await center.getByRole("tab", { name: "Unread (4)" }).click()
  await expect(center.getByText("2 new messages")).toBeVisible()
  await expect(center.getByRole("button", { name: "Mark 4 shown as read" })).toBeVisible()
  const remaining = (await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=unread", { cache: "no-store" })).json(),
  )) as FeedPage
  expect(remaining.unreadCount).toBe(4)
  expect(remaining.items).toHaveLength(4)
  const secondResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications/read" &&
      response.request().method() === "POST",
  )
  await center.getByRole("button", { name: "Mark 4 shown as read" }).click()
  const secondWrite = await secondResponse
  expect(secondWrite.ok()).toBe(true)
  expect(secondWrite.request().postDataJSON()).toEqual({
    notificationIds: [
      ...new Set(remaining.items.flatMap((item) => item.members.map((member) => member.notificationId))),
    ],
  })
  await expect(page.getByRole("button", { name: "Notifications, 0 unread notifications" })).toBeVisible()
  await center.getByRole("tab", { name: "All" }).click()
  await expect(center.getByRole("button", { name: /Mark \d+ shown as read/ })).toHaveCount(0)

  const otherReader = await request.get(`${websiteOrigin}/api/clinic-dashboard/notifications?mode=summary`, {
    headers: {
      Authorization: `Bearer ${secondToken}`,
      "X-Findmydoc-Clinic-Notifications-Contract": "clinic-notifications-v1",
      "X-Findmydoc-Clinic-Scope-Contract": "clinic-scope-v1",
    },
  })
  expect(otherReader.ok()).toBe(true)
  expect((await otherReader.json()).unreadCount).toBe(29)
  await page.screenshot({ path: "output/playwright/notification-214-bulk-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(center.getByRole("tab", { name: "All" })).toBeVisible()
  await page.screenshot({ path: "output/playwright/notification-214-bulk-mobile.png", fullPage: true })
})
