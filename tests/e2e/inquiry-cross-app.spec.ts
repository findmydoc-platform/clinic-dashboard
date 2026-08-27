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
