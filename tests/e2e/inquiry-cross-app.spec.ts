import { expect, test } from "@playwright/test"

function requiredValue(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing cross-app acceptance value: ${name}`)
  return value
}

function exactLoopbackOrigin(name: string) {
  const url = new URL(requiredValue(name))
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(`${name} must be an exact local HTTP origin`)
  }
  return url.origin
}

const websiteOrigin = exactLoopbackOrigin("INQUIRY_ACCEPTANCE_WEBSITE_ORIGIN")
const controlOrigin = exactLoopbackOrigin("INQUIRY_ACCEPTANCE_CONTROL_ORIGIN")
const foreignDashboardOrigin = exactLoopbackOrigin("INQUIRY_ACCEPTANCE_FOREIGN_DASHBOARD_ORIGIN")
const controlToken = requiredValue("INQUIRY_ACCEPTANCE_CONTROL_TOKEN")
const clinicName = requiredValue("INQUIRY_ACCEPTANCE_CLINIC_NAME")
const patientToken = requiredValue("INQUIRY_ACCEPTANCE_PATIENT_TOKEN")
const patientSessionCookie = requiredValue("INQUIRY_ACCEPTANCE_PATIENT_SESSION_COOKIE")
const foreignClinicToken = requiredValue("INQUIRY_ACCEPTANCE_FOREIGN_CLINIC_TOKEN")
const clinicToken = requiredValue("INQUIRY_ACCEPTANCE_CLINIC_TOKEN")
const secondClinicToken = requiredValue("INQUIRY_ACCEPTANCE_SECOND_CLINIC_TOKEN")
const inquiryId = requiredValue("INQUIRY_ACCEPTANCE_INQUIRY_ID")
const patientHeaders = { Authorization: `Bearer ${patientToken}` }

test("proves a tenant-safe clinic and patient exchange across both applications", async ({
  browser,
  page,
  request,
}) => {
  await page.setViewportSize({ height: 960, width: 1440 })
  await page.goto(`/?inquiry=${encodeURIComponent(inquiryId)}`)
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await page.getByRole("button", { name: "Sign in" }).click()

  const detail = page.getByRole("region", { name: "Inquiry from Ada Patient" })
  await expect(detail).toBeVisible()
  const clinicReply = "Synthetic clinic reply through both repositories."
  await detail.getByLabel("Choose reply attachment").setInputFiles({
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
    mimeType: "image/png",
    name: "cross-app-proof.png",
  })
  await expect(detail.getByText("cross-app-proof.png", { exact: true })).toBeVisible()
  await expect(detail.getByText("Uploading cross-app-proof.png.")).not.toBeVisible()
  await detail.getByRole("textbox", { name: "Reply to patient" }).fill(clinicReply)
  const clinicSendResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/dashboard/inquiries/messages",
  )
  await detail.getByRole("button", { name: "Send reply" }).click()
  expect((await clinicSendResponse).ok()).toBe(true)
  await expect(detail.getByText(clinicReply)).toBeVisible()

  const patientDetailResponse = await request.get(
    `${websiteOrigin}/api/patient/inquiries/detail?inquiryId=${encodeURIComponent(inquiryId)}`,
    { headers: patientHeaders },
  )
  expect(patientDetailResponse.ok()).toBe(true)
  const patientDetail = (await patientDetailResponse.json()) as {
    inquiry: { revision: number; timeline: Array<{ kind: string; text?: string }> }
  }
  expect(patientDetail.inquiry.timeline).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "external-message", text: clinicReply })]),
  )

  const patientReply = "Synthetic patient reply observed by the clinic."
  const patientContext = await browser.newContext()
  await patientContext.addCookies([
    {
      name: "sb-127-auth-token",
      sameSite: "Lax",
      url: websiteOrigin,
      value: patientSessionCookie,
    },
  ])
  const patientPage = await patientContext.newPage()
  await patientPage.goto(`${websiteOrigin}/patient/inquiries/${encodeURIComponent(inquiryId)}`)
  const patientConversation = patientPage.getByRole("region", { name: `Conversation with ${clinicName}` })
  await expect(patientConversation.getByText(clinicReply)).toBeVisible()
  await expect(patientConversation.getByText("cross-app-proof.png")).toBeVisible()
  const download = patientConversation.getByRole("link", { name: "Download cross-app-proof.png" })
  await expect(download).toHaveAttribute(
    "href",
    /\/api\/patient\/inquiries\/attachments\/download\?attachmentId=/u,
  )
  await patientConversation.getByRole("textbox", { name: "Message" }).fill(patientReply)
  await patientConversation.getByRole("button", { name: "Send" }).click()
  await expect(patientConversation.getByText(patientReply)).toBeVisible()
  await patientContext.close()

  const refreshedPatientDetailResponse = await request.get(
    `${websiteOrigin}/api/patient/inquiries/detail?inquiryId=${encodeURIComponent(inquiryId)}`,
    { headers: patientHeaders },
  )
  expect(refreshedPatientDetailResponse.ok()).toBe(true)
  const refreshedPatientDetail = (await refreshedPatientDetailResponse.json()) as {
    inquiry: { timeline: Array<{ kind: string; text?: string }> }
  }
  expect(refreshedPatientDetail.inquiry.timeline).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "external-message", text: patientReply })]),
  )

  await page.reload()
  const refreshedDetail = page.getByRole("region", { name: "Inquiry from Ada Patient" })
  await expect(refreshedDetail.getByText(patientReply)).toBeVisible()
  const bootstrap = await request.get(`${websiteOrigin}/api/clinic-dashboard/bootstrap`, {
    headers: {
      Authorization: `Bearer ${clinicToken}`,
      "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
    },
  })
  expect(bootstrap.ok()).toBe(true)
  await page.screenshot({ fullPage: true, path: "output/playwright/inquiry-cross-app.png" })

  const foreignContext = await browser.newContext()
  const foreignPage = await foreignContext.newPage()
  await foreignPage.goto(`${foreignDashboardOrigin}/?inquiry=${encodeURIComponent(inquiryId)}`)
  await foreignPage.getByLabel("Email address").fill("clinic-staff@example.com")
  await foreignPage.getByLabel("Password").fill("clinic-dashboard-cross-app")
  const foreignDetailResponse = foreignPage.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/inquiries/detail" &&
      response.request().method() === "GET",
  )
  await foreignPage.getByRole("button", { name: "Sign in" }).click()
  expect((await foreignDetailResponse).status()).toBe(404)
  await expect(foreignPage.getByText("No inquiries match these filters.")).toBeVisible()
  await expect(foreignPage.getByText("Ada Patient", { exact: true })).not.toBeVisible()
  const foreignMutation = await foreignPage.evaluate(async (targetInquiryId) => {
    const token = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("clinic_dashboard_csrf="))
      ?.split("=")[1]
    const response = await fetch("/api/dashboard/inquiries/messages", {
      body: JSON.stringify({
        expectedRevision: 1,
        idempotencyKey: "cross-app-foreign-mutation-0001",
        inquiryId: targetInquiryId,
        text: "This foreign mutation must be rejected.",
      }),
      headers: { "content-type": "application/json", "x-csrf-token": decodeURIComponent(token ?? "") },
      method: "POST",
    })
    return { body: await response.json(), status: response.status }
  }, inquiryId)
  expect(foreignMutation).toEqual({ body: { error: { code: "not-found" } }, status: 404 })
  await foreignContext.close()

  await page.getByRole("button", { name: /Notifications,.*unread/ }).click()
  const center = page.getByRole("dialog", { name: "Notifications" })
  await expect(center.getByText("Ada Patient", { exact: true })).toBeVisible()
  const arrival = await request.post(`${controlOrigin}/create-notification-inquiry`, {
    headers: { Authorization: `Bearer ${controlToken}` },
  })
  expect(arrival.ok()).toBe(true)
  const arrivalBody = (await arrival.json()) as {
    notificationId: string
    occurredAt: string
    displayName: string
  }
  await expect(center.getByText("Notification Arrival", { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(center.getByText(patientReply)).not.toBeVisible()
  await center.getByRole("tab", { name: "All" }).click()
  await expect(center.getByText("Notification Arrival", { exact: true })).toBeVisible()
  const notificationResult = await page.evaluate(async () => {
    const response = await fetch("/api/notifications?mode=page&view=all", { cache: "no-store" })
    return { body: await response.json(), status: response.status }
  })
  expect(notificationResult.status).toBe(200)
  expect(notificationResult.body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        display: expect.objectContaining({ eventLabel: "New inquiry", displayName: "Notification Arrival" }),
        members: [
          expect.objectContaining({
            notificationId: arrivalBody.notificationId,
            readAt: null,
            occurredAt: arrivalBody.occurredAt,
          }),
        ],
      }),
    ]),
  )
  await center.getByRole("button", { name: "Options for New inquiry from Notification Arrival" }).click()
  const markResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/notifications/read" &&
      response.request().method() === "POST",
  )
  await center.getByRole("menuitem", { name: "Mark as read: New inquiry from Notification Arrival" }).click()
  const confirmed = await markResponse
  expect(confirmed.status()).toBe(200)
  expect(confirmed.request().postDataJSON()).toEqual({ notificationIds: [arrivalBody.notificationId] })
  expect(await confirmed.json()).toMatchObject({
    contractVersion: "clinic-notifications-v1",
    acknowledged: true,
  })
  await expect(center.getByText("Marked as read.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Notifications, 1 unread notification" })).toBeVisible()
  const personalAfterMark = await page.evaluate(async () => {
    const response = await fetch("/api/notifications?mode=page&view=all", { cache: "no-store" })
    return response.json()
  })
  const markedOccurrence = personalAfterMark.items
    .flatMap((item: { members: Array<{ notificationId: string; readAt: string | null }> }) => item.members)
    .find((member: { notificationId: string }) => member.notificationId === arrivalBody.notificationId)
  expect(markedOccurrence?.readAt).toEqual(expect.any(String))
  const firstReadAt = markedOccurrence.readAt

  const anotherReader = await request.get(
    `${websiteOrigin}/api/clinic-dashboard/notifications?mode=page&view=all`,
    {
      headers: {
        Authorization: `Bearer ${secondClinicToken}`,
        "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
        "X-Findmydoc-Clinic-Notifications-Contract": "clinic-notifications-v1",
      },
    },
  )
  expect(anotherReader.status()).toBe(200)
  const anotherReaderBody = await anotherReader.json()
  expect(anotherReaderBody.unreadCount).toBe(2)
  expect(anotherReaderBody.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        members: [expect.objectContaining({ notificationId: arrivalBody.notificationId, readAt: null })],
      }),
    ]),
  )

  const repeated = await page.evaluate(async (notificationId) => {
    const csrf = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("clinic_dashboard_csrf="))
      ?.split("=")[1]
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      body: JSON.stringify({ notificationIds: [notificationId] }),
      headers: { "content-type": "application/json", "x-csrf-token": decodeURIComponent(csrf ?? "") },
    })
    return { status: response.status, body: await response.json() }
  }, arrivalBody.notificationId)
  expect(repeated).toMatchObject({ status: 200, body: { acknowledged: true } })

  await page.reload()
  await page.getByRole("button", { name: "Notifications, 1 unread notification" }).click()
  await center.getByRole("tab", { name: "All" }).click()
  await expect(center.getByText("Notification Arrival", { exact: true })).toBeVisible()
  await expect(
    center.getByRole("button", { name: "Options for New inquiry from Notification Arrival" }),
  ).not.toBeVisible()
  const afterReload = await page.evaluate(async () =>
    (await fetch("/api/notifications?mode=page&view=all", { cache: "no-store" })).json(),
  )
  expect(
    afterReload.items
      .flatMap((item: { members: Array<{ notificationId: string; readAt: string | null }> }) => item.members)
      .find((member: { notificationId: string }) => member.notificationId === arrivalBody.notificationId)
      ?.readAt,
  ).toBe(firstReadAt)

  const secondSession = await browser.newContext()
  const secondSessionPage = await secondSession.newPage()
  await secondSessionPage.goto(page.url())
  await secondSessionPage.getByLabel("Email address").fill("clinic-staff@example.com")
  await secondSessionPage.getByLabel("Password").fill("clinic-dashboard-cross-app")
  await secondSessionPage.getByRole("button", { name: "Sign in" }).click()
  await expect(
    secondSessionPage.getByRole("button", { name: "Notifications, 1 unread notification" }),
  ).toBeVisible()
  await secondSessionPage.getByRole("button", { name: "Notifications, 1 unread notification" }).click()
  const secondSessionCenter = secondSessionPage.getByRole("dialog", { name: "Notifications" })
  await secondSessionCenter.getByRole("tab", { name: "All" }).click()
  await expect(secondSessionCenter.getByText("Notification Arrival", { exact: true })).toBeVisible()
  await expect(
    secondSessionCenter.getByRole("button", { name: "Options for New inquiry from Notification Arrival" }),
  ).not.toBeVisible()
  await secondSession.close()
  await center.getByRole("button", { name: "Close notifications" }).click()
  await page.screenshot({ fullPage: true, path: "output/playwright/notification-cross-app.png" })

  const offboardResponse = await request.post(`${controlOrigin}/offboard-clinic-staff`, {
    headers: { Authorization: `Bearer ${controlToken}` },
  })
  expect(offboardResponse.status()).toBe(204)
  const offboardedQueue = await page.evaluate(async () => {
    const response = await fetch("/api/dashboard/inquiries?lifecycle=all")
    return { body: await response.json(), status: response.status }
  })
  expect(offboardedQueue).toEqual({ body: { error: { code: "access-denied" } }, status: 403 })
  await page.reload()
  await expect(page.getByText("Ada Patient")).not.toBeVisible()

  const foreignQueue = await request.get(`${websiteOrigin}/api/clinic-dashboard/inquiries?lifecycle=all`, {
    headers: {
      Authorization: `Bearer ${foreignClinicToken}`,
      "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
    },
  })
  expect(foreignQueue.ok()).toBe(true)
  const foreignQueueBody = (await foreignQueue.json()) as { items: Array<{ id: string }> }
  expect(foreignQueueBody.items.some((item) => item.id === inquiryId)).toBe(false)
})
