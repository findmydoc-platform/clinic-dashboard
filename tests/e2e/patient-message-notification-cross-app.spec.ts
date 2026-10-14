import { expect, test } from "@playwright/test"
function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing cross-app acceptance value: ${name}`)
  return value
}
const controlOrigin = required("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN")
const websiteOrigin = required("INQUIRY_ACCEPTANCE_WEBSITE_ORIGIN")
const controlToken = required("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")
const secondToken = required("INQUIRY_ACCEPTANCE_SECOND_CLINIC_TOKEN")
const inquiryId = required("INQUIRY_ACCEPTANCE_INQUIRY_ID")
test("groups real patient messages and acknowledges only the displayed selection across both applications", async ({
  page,
  request,
  browser,
}) => {
  const createMessage = async () => {
    const result = await request.post(`${controlOrigin}/create-patient-message`, {
      headers: { Authorization: `Bearer ${controlToken}` },
    })
    expect(result.ok()).toBe(true)
    return (await result.json()) as {
      members: Array<{ notificationId: string; sourceOccurrenceId: string; occurredAt: string }>
    }
  }
  await createMessage()
  const selected = await createMessage()
  const started = Date.now()
  await page.goto("/")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("button", { name: "Notifications, 2 unread notifications" }).click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  await expect(center.getByRole("button", { name: "Open 2 new messages from Ada Patient" })).toBeVisible()
  expect(Date.now() - started).toBeLessThan(60_000)
  let detailReads = 0
  let later: Awaited<ReturnType<typeof createMessage>> | undefined
  await page.route(
    "**/api/dashboard/inquiries/detail?**",
    async (route) => {
      detailReads += 1
      later = await createMessage()
      await route.continue()
    },
    { times: 1 },
  )
  const displayed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/inquiries/detail" &&
      response.request().method() === "GET",
  )
  const marked = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications/read" &&
      response.request().method() === "POST",
  )
  await center.getByRole("button", { name: "Open 2 new messages from Ada Patient" }).click()
  const detail = page.getByRole("region", { name: "Inquiry from Ada Patient" })
  await expect(detail).toBeVisible()
  expect((await (await displayed).json()).inquiry.id).toBe(inquiryId)
  await expect(detail.getByRole("group").filter({ hasText: "patient-message-proof.png" })).toBeFocused()
  const ack = await marked
  expect(ack.ok()).toBe(true)
  expect(ack.request().postDataJSON()).toEqual({
    notificationIds: selected.members.map((member) => member.notificationId),
  })
  expect(detailReads).toBe(1)
  expect(later?.members).toHaveLength(3)
  const readAll = () =>
    page.evaluate(async () =>
      (await fetch("/api/notifications?mode=page&view=all", { cache: "no-store" })).json(),
    )
  const all = await readAll()
  const messages = all.items.filter(
    (item: { members: Array<{ eventType: string }> }) =>
      item.members[0]?.eventType === "patient_message_received",
  )
  expect(JSON.stringify(messages)).not.toContain("patient-message-proof.png")
  expect(messages.filter((item: { kind: string }) => item.kind === "occurrence")).toHaveLength(2)
  expect(
    messages.find((item: { kind: string }) => item.kind === "patient_message_group").members,
  ).toHaveLength(1)
  const readAt = messages
    .filter((item: { kind: string }) => item.kind === "occurrence")
    .map((item: { members: Array<{ readAt: string }> }) => item.members[0]!.readAt)
  expect(readAt).toEqual([expect.any(String), expect.any(String)])
  const other = await request.get(`${websiteOrigin}/api/clinic-dashboard/notifications?mode=page&view=all`, {
    headers: {
      Authorization: `Bearer ${secondToken}`,
      "X-Findmydoc-Clinic-Notifications-Contract": "clinic-notifications-v1",
    },
  })
  expect(other.ok()).toBe(true)
  expect(
    (await other.json()).items.find((item: { kind: string }) => item.kind === "patient_message_group")
      .members,
  ).toHaveLength(3)
  await page.getByRole("button", { name: "Notifications, 2 unread notifications" }).click()
  await center.getByRole("tab", { name: "All" }).click()
  await expect(center.getByRole("button", { name: "Open 1 new message from Ada Patient" })).toBeVisible()
  await expect(center.getByRole("button", { name: "Open New patient message from Ada Patient" })).toHaveCount(
    2,
  )
  await page.setViewportSize({ width: 1440, height: 960 })
  await expect(page.locator("nextjs-portal").getByText(/Compiling|Rendering/)).not.toBeVisible()
  await page.screenshot({ path: "output/playwright/notification-203-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator("nextjs-portal").getByText(/Compiling|Rendering/)).not.toBeVisible()
  await page.screenshot({ path: "output/playwright/notification-203-mobile.png", fullPage: true })
  await page.reload()
  await page.getByRole("button", { name: "Notifications, 2 unread notifications" }).click()
  const replay = await readAll()
  expect(
    replay.items
      .filter(
        (item: { kind: string; members: Array<{ eventType: string }> }) =>
          item.kind === "occurrence" && item.members[0]?.eventType === "patient_message_received",
      )
      .map((item: { members: Array<{ readAt: string }> }) => item.members[0]!.readAt),
  ).toEqual(readAt)
  const session = await browser.newContext({ storageState: await page.context().storageState() })
  const another = await session.newPage()
  await another.goto("/")
  await expect(another.getByRole("button", { name: "Notifications, 2 unread notifications" })).toBeVisible()
  await session.close()
  const removed = await request.post(`${controlOrigin}/remove-latest-patient-message`, {
    headers: { Authorization: `Bearer ${controlToken}` },
  })
  expect(removed.ok()).toBe(true)
  await page.route(
    "**/api/dashboard/inquiries/detail?**",
    async (route) => {
      detailReads += 1
      await route.continue()
    },
    { times: 1 },
  )
  const fallbackMarked = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications/read" &&
      response.request().method() === "POST",
  )
  await center.getByRole("button", { name: "Open 1 new message from Ada Patient" }).click()
  await expect(detail.getByRole("heading", { name: "Ada Patient", exact: true })).toBeFocused()
  const fallback = await fallbackMarked
  expect(fallback.ok()).toBe(true)
  expect(fallback.request().postDataJSON()).toEqual({ notificationIds: [later!.members[2]!.notificationId] })
  expect(detailReads).toBe(2)
})
