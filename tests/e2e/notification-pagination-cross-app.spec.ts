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
const foreignToken = required("INQUIRY_ACCEPTANCE_FOREIGN_CLINIC_TOKEN")
const clinicToken = required("INQUIRY_ACCEPTANCE_CLINIC_TOKEN")
const contractHeader = { "X-Findmydoc-Clinic-Notifications-Contract": "clinic-notifications-v1" }
type FeedItem = {
  presentationId: string
  kind: string
  members: Array<{ notificationId: string }>
  destination: { anchor?: { kind: string } }
}
type FeedPage = { unreadCount?: number; items: FeedItem[]; nextCursor: string | null }

test("browses complete older notifications and keeps the cursor scoped to this reader", async ({
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
  await expect(center.getByRole("button", { name: "Load more" })).toBeVisible()
  const initial = (await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=unread", { cache: "no-store" })).json(),
  )) as FeedPage
  expect(initial.unreadCount).toBe(28)
  expect(initial.items).toHaveLength(25)
  expect(initial.nextCursor).toEqual(expect.any(String))
  const continuation = (await page.evaluate(async (cursor: string) => {
    const params = new URLSearchParams({ mode: "page", view: "unread", cursor })
    return (await fetch(`/api/notifications?${params}`, { cache: "no-store" })).json()
  }, initial.nextCursor as string)) as FeedPage
  expect(continuation.items).toHaveLength(3)
  expect(continuation.nextCursor).toBeNull()
  expect("unreadCount" in continuation).toBe(false)
  expect(new Set([...initial.items, ...continuation.items].map((item) => item.presentationId)).size).toBe(28)
  const group = continuation.items.find((item) => item.kind === "patient_message_group")
  expect(group?.members).toHaveLength(2)
  expect(group?.destination.anchor).toMatchObject({ kind: "message" })
  for (const [token, view] of [
    [secondToken, "unread"],
    [foreignToken, "unread"],
    [clinicToken, "all"],
  ] as const) {
    const result = await request.get(
      `${websiteOrigin}/api/clinic-dashboard/notifications?${new URLSearchParams({
        mode: "page",
        view,
        cursor: initial.nextCursor!,
      })}`,
      { headers: { ...contractHeader, Authorization: `Bearer ${token}` } },
    )
    expect(result.status()).toBe(400)
    expect(await result.json()).toMatchObject({ error: { code: "CURSOR_INVALID" } })
  }

  await center.getByRole("button", { name: "Load more" }).click()
  await expect(center.getByText("2 new messages")).toBeVisible()
  await expect(center.locator('ul[aria-label="Notifications"] > li')).toHaveCount(28)
  await expect(center.getByRole("button", { name: "Load more" })).toHaveCount(0)
  await center.getByRole("button", { name: "Options for 2 new messages from Ada Patient" }).click()
  const marked = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications/read" &&
      response.request().method() === "POST",
  )
  await center.getByRole("menuitem", { name: "Mark as read: 2 new messages from Ada Patient" }).click()
  const acknowledgement = await marked
  expect(acknowledgement.ok()).toBe(true)
  expect(acknowledgement.request().postDataJSON()).toEqual({
    notificationIds: group!.members.map((member) => member.notificationId),
  })
  await expect(page.getByRole("button", { name: "Notifications, 27 unread notifications" })).toBeVisible()
  await center.getByRole("tab", { name: "All" }).click()
  await center.getByRole("button", { name: "Load more" }).click()
  await expect(center.getByText("New patient message")).toHaveCount(2)
  await page.screenshot({ path: "output/playwright/notification-207-history-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(center.getByText("New patient message")).toHaveCount(2)
  await page.screenshot({ path: "output/playwright/notification-207-history-mobile.png", fullPage: true })
})
