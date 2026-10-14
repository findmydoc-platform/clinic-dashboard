import { expect, test } from "@playwright/test"

const required = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing review decision acceptance value: ${name}`)
  return value
}
const controlOrigin = required("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN")
const controlToken = required("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")
const websiteOrigin = required("INQUIRY_ACCEPTANCE_WEBSITE_ORIGIN")
const secondToken = required("INQUIRY_ACCEPTANCE_SECOND_CLINIC_TOKEN")
const headers = { Authorization: `Bearer ${controlToken}` }

type SourceEvidence = {
  reviewId: string
  notifications: Array<{ notificationId: string; eventType: string; occurredAt: string }>
}

test("opens exact authorized review decisions before personal acknowledgment and keeps appeal distinct", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()

  const create = async (route: string): Promise<SourceEvidence> => {
    const result = await request.post(`${controlOrigin}${route}`, { headers })
    expect(result.ok()).toBe(true)
    return (await result.json()) as SourceEvidence
  }
  const response = await create("/create-response-decision-review")
  const responseOccurrence = response.notifications.find(
    (entry) => entry.eventType === "clinic_response_decided",
  )
  expect(responseOccurrence).toBeDefined()
  expect(
    response.notifications.filter((entry) => entry.eventType === "clinic_response_decided"),
  ).toHaveLength(1)

  await page.getByRole("button", { name: /^Notifications,/ }).click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  await expect(center.getByText("Response approved", { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(center.getByText("Thank you for the detailed synthetic review.")).toHaveCount(0)
  let submitted: unknown
  await page.route("**/api/notifications/read", async (route) => {
    submitted = route.request().postDataJSON()
    await expect(
      page.getByRole("region", { name: "Selected review" }).getByText("Synthetic decision review 1."),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Review details", exact: true })).toBeFocused()
    await route.continue()
  })
  await center.getByRole("button", { name: "Open Review response decision" }).click()
  await expect(page.getByText("Review opened. Marked as read.", { exact: true })).toBeVisible()
  expect(submitted).toEqual({ notificationIds: [responseOccurrence!.notificationId] })
  await page.unroute("**/api/notifications/read")
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
  ).toContainEqual(
    expect.objectContaining({ notificationId: responseOccurrence!.notificationId, readAt: null }),
  )

  const appeal = await create("/create-appeal-decision-review")
  const appealOccurrence = appeal.notifications.find((entry) => entry.eventType === "review_appeal_decided")
  expect(appealOccurrence).toBeDefined()
  expect(appeal.notifications.filter((entry) => entry.eventType === "review_appeal_decided")).toHaveLength(1)
  expect(appeal.notifications.some((entry) => entry.eventType === "review_published")).toBe(true)
  expect(appealOccurrence!.notificationId).not.toBe(
    appeal.notifications.find((entry) => entry.eventType === "review_published")!.notificationId,
  )
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  await expect(center.getByText("Decision rejected", { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(center.getByText("Private synthetic decision reason.")).toHaveCount(0)
  await center.getByRole("button", { name: "Open Review appeal decision" }).click()
  await expect(page.getByText("Review opened. Marked as read.", { exact: true })).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Selected review" }).getByText("Synthetic decision review 2."),
  ).toBeVisible()
  const personalFeed = await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=all")).json(),
  )
  expect(
    personalFeed.items
      .flatMap((item: { members: Array<{ notificationId: string; readAt: string | null }> }) => item.members)
      .find(
        (member: { notificationId: string }) => member.notificationId === appealOccurrence!.notificationId,
      )?.readAt,
  ).toEqual(expect.any(String))
  await page.screenshot({ path: "output/playwright/notification-205-cross-app-desktop.png", fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole("button", { name: /^Notifications,/ }).click()
  await expect(center.getByText("Decision rejected", { exact: true })).toBeVisible()
  await page.screenshot({ path: "output/playwright/notification-205-cross-app-mobile.png", fullPage: true })
})
