import { expect, test } from "@playwright/test"

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing review acceptance value: ${name}`)
  return value
}
const controlOrigin = required("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN")
const controlToken = required("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")
const websiteOrigin = required("INQUIRY_ACCEPTANCE_WEBSITE_ORIGIN")
const secondToken = required("INQUIRY_ACCEPTANCE_SECOND_CLINIC_TOKEN")
const headers = { Authorization: `Bearer ${controlToken}` }

test("shows real review transitions, exact off-page detail, current safe projections and personal receipts across both apps", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("button", { name: "Reviews", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Reviews", exact: true })).toBeVisible()
  const rating = page.getByRole("combobox", { name: "Rating", exact: true })
  await rating.selectOption("1")
  await page.getByRole("button", { name: "Apply", exact: true }).click()
  await expect(page.getByText("Filters applied.", { exact: true })).toBeVisible()
  const expectPersonalReceipt = async (notificationId: string) => {
    await expect
      .poll(
        async () =>
          page.evaluate(async (id) => {
            const feed = await (await fetch("/api/notifications?mode=page&view=all")).json()
            return feed.items
              .flatMap(
                (item: { members: Array<{ notificationId: string; readAt: string | null }> }) => item.members,
              )
              .find((member: { notificationId: string }) => member.notificationId === id)?.readAt
          }, notificationId),
        { timeout: 15_000 },
      )
      .toEqual(expect.any(String))
  }
  const start = Date.now()
  const arrival = await request.post(`${controlOrigin}/create-notification-review`, { headers })
  expect(arrival.ok()).toBe(true)
  const body = (await arrival.json()) as {
    reviewId: string
    notifications: Array<{ notificationId: string; eventType: string }>
  }
  const publicationId = body.notifications.find(
    (member) => member.eventType === "review_published",
  )!.notificationId
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  await expect(center.getByRole("button", { name: "Open New review", exact: true })).toBeVisible({
    timeout: 60_000,
  })
  expect(Date.now() - start).toBeLessThan(60_000)
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let submitted: unknown
  await page.route(`**/api/dashboard/reviews/${body.reviewId}`, async (route) => {
    const response = await route.fetch()
    await held
    await route.fulfill({ response })
  })
  await page.route("**/api/notifications/read", async (route) => {
    submitted = route.request().postDataJSON()
    await expect(
      page
        .getByRole("region", { name: "Selected review" })
        .getByText("Exact synthetic review from a notification."),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Review details", exact: true })).toBeFocused()
    await route.continue()
  })
  await center.getByRole("button", { name: "Open New review", exact: true }).click()
  await expect(page.getByText("Loading review details…")).toBeVisible()
  expect(submitted).toBeUndefined()
  release()
  await expect(page.getByText("Review opened. Marked as read.", { exact: true })).toBeVisible()
  expect(submitted).toEqual({ notificationIds: [publicationId] })
  await expectPersonalReceipt(publicationId)
  await page.unroute(`**/api/dashboard/reviews/${body.reviewId}`)
  await page.unroute("**/api/notifications/read")
  expect(await rating.inputValue()).toBe("1")
  await expect(
    page
      .getByRole("region", { name: "Review list" })
      .getByText("Exact synthetic review from a notification."),
  ).toHaveCount(0)
  const otherReader = await request.get(
    `${websiteOrigin}/api/clinic-dashboard/notifications?mode=page&view=all`,
    {
      headers: {
        Authorization: `Bearer ${secondToken}`,
        "X-Findmydoc-Clinic-Notifications-Contract": "clinic-notifications-v1",
      },
    },
  )
  expect(otherReader.ok()).toBe(true)
  expect(
    (await otherReader.json()).items.flatMap((item: { members: unknown[] }) => item.members),
  ).toContainEqual(expect.objectContaining({ notificationId: publicationId, readAt: null }))
  await page.screenshot({ path: "output/playwright/notification-204-cross-app-desktop.png", fullPage: true })
  await rating.selectOption("all")
  await page.getByRole("button", { name: "Apply", exact: true }).click()
  await expect(page.getByText("Filters applied.", { exact: true })).toBeVisible()
  await expect(
    page
      .getByRole("region", { name: "Review list" })
      .getByText("Exact synthetic review from a notification."),
  ).toBeVisible()
  const withdrawn = await request.post(`${controlOrigin}/withdraw-notification-review`, { headers })
  expect(withdrawn.ok()).toBe(true)
  const withdrawnBody = (await withdrawn.json()) as typeof body
  const withdrawalId = withdrawnBody.notifications.find(
    (member) => member.eventType === "review_withdrawn",
  )!.notificationId
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  await expect(center.getByRole("button", { name: "Open Review withdrawn", exact: true })).toBeVisible()
  await center.getByRole("button", { name: "Open Review withdrawn", exact: true }).click()
  await expect(page.getByText("Review opened. Marked as read.", { exact: true })).toBeVisible()
  await expectPersonalReceipt(withdrawalId)
  const selectedReview = page.getByRole("region", { name: "Selected review" })
  await expect(selectedReview.getByText("Approved review", { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole("region", { name: "Review list" }).getByText("Approved review", { exact: true }),
  ).toHaveCount(0)
  await expect(selectedReview.getByRole("button", { name: "Respond", exact: true })).toBeEnabled()
  await expect(selectedReview.getByRole("button", { name: "Submit appeal", exact: true })).toBeEnabled()
  await expect(
    page
      .getByRole("region", { name: "Selected review" })
      .getByText("Exact synthetic review from a notification."),
  ).toHaveCount(0)
  const removed = await request.post(`${controlOrigin}/remove-notification-review`, { headers })
  await expect(page.getByText("Exact synthetic review from a notification.", { exact: true })).toHaveCount(0)
  expect(removed.ok()).toBe(true)
  const removedBody = (await removed.json()) as typeof body
  const removalId = removedBody.notifications.find(
    (member) => member.eventType === "review_removed",
  )!.notificationId
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  await center.getByRole("button", { name: "Open Review removed", exact: true }).click()
  await expect(page.getByText("Review opened. Marked as read.", { exact: true })).toBeVisible()
  await expectPersonalReceipt(removalId)
  await expect(selectedReview.getByText("Approved review", { exact: true })).toHaveCount(0)
  await expect(selectedReview.getByRole("button", { name: "Respond", exact: true })).toBeEnabled()
  await expect(selectedReview.getByRole("button", { name: "Submit appeal", exact: true })).toBeEnabled()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: "output/playwright/notification-204-cross-app-mobile.png", fullPage: true })
  const trashed = await request.post(`${controlOrigin}/trash-notification-review`, { headers })
  expect(trashed.ok()).toBe(true)
  const trashBody = (await trashed.json()) as typeof body
  const removalIds = trashBody.notifications
    .filter((member) => member.eventType === "review_removed")
    .map((member) => member.notificationId)
  const remaining = await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=unread")).json(),
  )
  const lastId = remaining.items
    .flatMap((item: { members: Array<{ notificationId: string }> }) => item.members)
    .find((member: { notificationId: string }) => removalIds.includes(member.notificationId))!.notificationId
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  const mobileCenter = page.getByRole("dialog", { name: "Notifications" })
  await mobileCenter.getByRole("button", { name: "Open Review removed", exact: true }).click()
  await expect(page.getByRole("region", { name: "Selected review" }).getByRole("status")).toHaveText(
    "This review is unavailable.",
  )
  const beforeExplicit = await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=all")).json(),
  )
  expect(beforeExplicit.items.flatMap((item: { members: unknown[] }) => item.members)).toContainEqual(
    expect.objectContaining({ notificationId: lastId, readAt: null }),
  )
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  await mobileCenter.getByRole("button", { name: "Options for Review removed", exact: true }).click()
  await mobileCenter.getByRole("menuitem", { name: "Mark as read: Review removed", exact: true }).click()
  await expect(mobileCenter.getByText("Marked as read.", { exact: true })).toBeVisible()
  await expectPersonalReceipt(lastId)
})
