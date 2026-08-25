import { expect, test, type Page } from "@playwright/test"

const testDashboardPassword = "clinic-dashboard-test"
const testDashboardOrigin = `http://127.0.0.1:${process.env.CLINIC_DASHBOARD_E2E_PORT ?? "3100"}`

async function signIn(page: Page) {
  const response = await page.goto("/")
  expect(response?.headers()["x-robots-tag"]).toContain("noindex")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill(testDashboardPassword)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  await expect(page.getByText("Mixed data.", { exact: true })).toBeVisible()
  await page.waitForLoadState("networkidle")
}

test("authenticates and exposes the complete workspace shell", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await expect(page.getByRole("switch", { name: "Demo scope" })).toHaveCount(0)
  await expect(page.getByRole("group", { name: "Reporting period" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toBeVisible()
  await expect(page.getByRole("button", { name: "Notifications, 4 new notifications" })).toBeVisible()

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.keyboard.press("Tab")
  const skipLink = page.getByRole("link", { name: "Skip to main content" })
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.locator("#clinic-dashboard-main")).toBeFocused()

  for (const section of ["Inquiries", "Reviews", "Clinic profile", "Subscriptions", "Credentials"] as const) {
    await page.getByRole("button", { exact: true, name: section }).click()
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: section === "Credentials" ? "Certificates and accreditations" : section,
      }),
    ).toBeVisible()
  }

  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  await expect(page.getByRole("switch", { name: "Demo scope" })).toHaveCount(0)

  const health = await page.request.get("/api/health")
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toEqual({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
})

test("opens safe inquiry deep links and fails closed for foreign or unsafe identifiers", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await page.goto("/?inquiry=inquiry-lukas-weber")
  await expect(page).toHaveURL(/\/login\?next=/)
  expect(new URL(page.url()).searchParams.get("next")).toBe("/?inquiry=inquiry-lukas-weber")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill(testDashboardPassword)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(`${testDashboardOrigin}/?inquiry=inquiry-lukas-weber`)
  await expect(page.getByRole("button", { name: "Inquiries" })).toHaveAttribute("aria-current", "page")
  await expect(page.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()

  await page.goto("/?inquiry=inquiry-foreign-clinic")
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()
  await expect(page.getByText("inquiry-foreign-clinic")).toHaveCount(0)

  await page.goto("/?inquiry=unsafe%2Finquiry")
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
})

test("switches complete location snapshots and resets local demo changes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  const locationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  const dashboardLocation = page.getByRole("region", { name: "Dashboard clinic location summary" })
  const dashboardMetrics = page.getByRole("region", { name: "Dashboard metrics" })
  const publicProfileProgress = page.getByRole("progressbar", {
    name: "Public profile progress: 83%",
  })

  await expect(locationSelector).toHaveAccessibleName(
    /Current location: Demo data · Avenora Clinic — İstanbul/,
  )
  await expect(dashboardMetrics.getByText("18,420")).toBeVisible()
  await expect(publicProfileProgress).toBeVisible()
  await page.getByRole("button", { name: "90 days" }).click()
  await expect(publicProfileProgress).toBeVisible()
  await page.locator('[data-funnel-stage="impressions"]').click()
  await expect(page.getByText("Impressions over time")).toBeVisible()

  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await expect(locationSelector).toHaveAccessibleName(/Current location: Demo data · Avenora Clinic — İzmir/)
  await expect(dashboardLocation.getByText("Alsancak, İzmir")).toBeVisible()
  await expect(dashboardMetrics.getByText("35,920")).toBeVisible()
  await expect(publicProfileProgress).toBeVisible()
  await expect(page.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Impressions over time")).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Inquiries" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()

  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — Antalya/ }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Reviews" }).click()
  await expect(page.getByText("Maya K.")).toBeVisible()
  await page.getByRole("button", { name: "Clinic profile" }).click()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Clinic name" })).toHaveCount(0)

  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()
  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — Antalya/ }).click()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()

  await page.getByRole("button", { name: "Dashboard" }).click()
  await expect(page.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(publicProfileProgress).toBeVisible()
  await expect(page.getByText("Impressions over time")).toBeVisible()

  await page.getByRole("button", { name: "Clinic profile" }).click()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()

  await page.reload()

  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toHaveAccessibleName(
    /Current location: Demo data · Avenora Clinic — İstanbul/,
  )
  await expect(
    page.getByRole("region", { name: "Dashboard clinic location summary" }).getByText("Levent, İstanbul"),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "false")
  await expect(publicProfileProgress).toBeVisible()
  await expect(page.getByText("Profile views over time")).toBeVisible()
  await expect(page.getByText("Impressions over time")).toHaveCount(0)

  const reloadedLocationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  await reloadedLocationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await page.getByRole("button", { exact: true, name: "Inquiries" }).click()
  await expect(page.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()
  await page.getByRole("button", { name: "Clinic profile" }).click()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()
})

test("works an inquiry end to end and guards an unsent draft before sign out", async ({ page }) => {
  await page.setViewportSize({ height: 960, width: 1440 })
  await signIn(page)

  await page.getByRole("button", { exact: true, name: "Inquiries" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()

  await page.getByRole("button", { name: /Aylin Kaya/ }).click()
  const detail = page.getByRole("region", { name: "Inquiry from Aylin Kaya" })
  await expect(detail.getByText("Guest inquiry · No chat")).toBeVisible()
  await expect(detail.getByRole("textbox", { name: "Reply to patient" })).toHaveCount(0)

  const status = detail.getByRole("combobox", { name: "Inquiry status" })
  await status.selectOption("in_review")
  await expect(status).toHaveValue("in_review")

  const note = detail.getByRole("textbox", { name: "Internal note" })
  await note.fill("Synthetic note from the inquiry browser journey.")
  await detail.getByRole("button", { name: "Add note" }).click()
  await expect(detail.getByText("Synthetic note from the inquiry browser journey.")).toBeVisible()
  await expect(note).toHaveValue("")

  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const reply = page.getByRole("textbox", { name: "Reply to patient" })
  await reply.fill("Unsent synthetic reply kept for the draft guard.")

  let logoutRequests = 0
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/auth/logout") logoutRequests += 1
  })
  let confirmationMessage = ""
  page.once("dialog", async (dialog) => {
    confirmationMessage = dialog.message()
    await dialog.dismiss()
  })
  await page.getByRole("button", { name: /Open account menu/ }).click()
  await page.getByRole("menuitem", { name: "Sign out" }).click()

  await expect.poll(() => confirmationMessage).toContain("discard all unsent inquiry")
  expect(logoutRequests).toBe(0)
  await expect(page).toHaveURL(/\/$/)
  await expect(reply).toHaveValue("Unsent synthetic reply kept for the draft guard.")

  await reply.fill("")
})

test("uploads and sends a synthetic reply attachment through the controlled BFF", async ({ page }) => {
  await page.setViewportSize({ height: 960, width: 1440 })
  await signIn(page)

  const attachmentRequests: string[] = []
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (
      url.pathname.startsWith("/api/dashboard/inquiries/attachments/drafts") ||
      url.pathname === "/api/dashboard/inquiries/messages"
    ) {
      attachmentRequests.push(`${request.method()} ${url.pathname}`)
    }
  })

  await page.getByRole("button", { exact: true, name: "Inquiries" }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const detail = page.getByRole("region", { name: "Inquiry from Lukas Weber" })
  const status = detail.getByRole("combobox", { name: "Inquiry status" })
  await status.selectOption("in_review")
  await expect(status).toHaveValue("in_review")

  await detail.getByLabel("Choose reply attachment").setInputFiles({
    buffer: Buffer.from("%PDF-1.4\nSynthetic treatment plan\n%%EOF", "utf8"),
    mimeType: "application/pdf",
    name: "synthetic-treatment-plan.pdf",
  })
  await expect(detail.getByText("synthetic-treatment-plan.pdf", { exact: true })).toBeVisible()
  await expect(detail.getByText("application/pdf · 39 B")).toBeVisible()

  const reply = detail.getByRole("textbox", { name: "Reply to patient" })
  await reply.fill("Synthetic reply with a controlled attachment.")
  await detail.getByRole("button", { name: "Send reply" }).click()

  await expect(detail.getByText("Synthetic reply with a controlled attachment.")).toBeVisible()
  await expect(detail.getByText("synthetic-treatment-plan.pdf", { exact: true })).toBeVisible()
  await expect(status).toHaveValue("contacted")
  expect(attachmentRequests).toEqual(
    expect.arrayContaining([
      "POST /api/dashboard/inquiries/attachments/drafts",
      "PUT /api/dashboard/inquiries/attachments/drafts/upload",
      "POST /api/dashboard/inquiries/attachments/drafts/finalize",
      "POST /api/dashboard/inquiries/messages",
    ]),
  )

  await page.reload()
  await page.getByRole("button", { exact: true, name: "Inquiries" }).click()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const reloadedDetail = page.getByRole("region", { name: "Inquiry from Lukas Weber" })
  await expect(reloadedDetail.getByText("Synthetic reply with a controlled attachment.")).toBeVisible()
  await expect(reloadedDetail.getByText("synthetic-treatment-plan.pdf", { exact: true })).toBeVisible()
  await expect(reloadedDetail.getByRole("combobox", { name: "Inquiry status" })).toHaveValue("contacted")
})

test("keeps the inquiry list and detail separate at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ height: 760, width: 320 })
  await signIn(page)

  await page.getByRole("button", { name: "Open navigation" }).click()
  await page
    .getByRole("dialog", { name: "Clinic navigation" })
    .getByRole("button", { exact: true, name: "Inquiries" })
    .click()
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)

  const inquiry = page.getByRole("button", { name: /Lukas Weber/ })
  await inquiry.click()
  await expect(page.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeHidden()
  await page.getByRole("button", { name: "Back to inquiries" }).click()
  await expect(inquiry).toBeFocused()
  await expect(page.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeHidden()
})

test("reauthenticates once before revealing protected inquiry contact details", async ({ page }) => {
  await page.setViewportSize({ height: 960, width: 1440 })
  await signIn(page)

  let revealAttempts = 0
  await page.route("**/api/dashboard/inquiries/contact/reveal", async (route) => {
    revealAttempts += 1
    if (revealAttempts === 1) {
      await route.fulfill({
        body: JSON.stringify({ error: { code: "reauthentication-required" } }),
        contentType: "application/json",
        status: 401,
      })
      return
    }
    await route.continue()
  })

  await page.getByRole("button", { exact: true, name: "Inquiries" }).click()
  await page.getByRole("button", { name: "spam" }).click()
  await page.getByRole("button", { name: /Unknown sender/ }).click()
  await page.getByText("Inquiry details", { exact: true }).click()
  await page.getByText("Protected contact details", { exact: true }).click()

  const note = page.getByRole("textbox", { name: "Internal note" })
  await note.fill("Synthetic protected-contact context remains unsent.")
  await page.getByRole("button", { name: "Reveal contact details" }).click()

  const dialog = page.getByRole("dialog", { name: "Confirm your identity" })
  await expect(dialog).toBeVisible()
  const password = dialog.getByLabel("Password")
  await password.fill("wrong-synthetic-password")
  await dialog.getByRole("button", { name: "Confirm and reveal" }).click()
  await expect(dialog.getByRole("alert")).toContainText("password was not accepted")
  await expect(note).toHaveValue("Synthetic protected-contact context remains unsent.")

  await password.fill(testDashboardPassword)
  await dialog.getByRole("button", { name: "Confirm and reveal" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText("protected.sender@example.test")).toBeVisible()
  await expect(note).toHaveValue("Synthetic protected-contact context remains unsent.")
  expect(revealAttempts).toBe(2)

  await note.fill("")
})

test("manages review responses, appeals, filters, and history through the authenticated BFF", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("button", { exact: true, name: "Reviews" }).click()

  await page.getByLabel("Visibility").selectOption("removed")
  await page.getByRole("button", { name: "Apply" }).click()
  await expect(page.getByText("Review text removed")).toBeVisible()

  await page.getByLabel("Visibility").selectOption("all")
  await page.getByRole("button", { name: "Apply" }).click()
  const review = page.getByRole("region", { name: "Review by Maya K., Dentistry" })
  const pendingResponseReview = page.getByRole("region", {
    name: "Review by Anonymous patient, Hair transplant",
  })

  await expect(review.getByRole("button", { name: /response/i })).toHaveCount(0)
  await pendingResponseReview.getByRole("button", { name: "Edit pending response" }).click()
  const responseDialog = page.getByRole("dialog", { name: "Edit pending response" })
  await responseDialog
    .getByLabel("Clinic response")
    .fill("Thank you for the detailed feedback. We have shared it with our clinic team.")
  await responseDialog.getByRole("button", { name: "Submit for moderation" }).click()
  await expect(
    pendingResponseReview.getByText(
      "Thank you for the detailed feedback. We have shared it with our clinic team.",
    ),
  ).toBeVisible()

  await review.getByRole("button", { name: "Submit appeal" }).click()
  const appealDialog = page.getByRole("dialog", { name: "Submit review appeal" })
  await appealDialog.getByLabel("Reason").selectOption("incorrect_clinic")
  await appealDialog
    .getByLabel("Appeal details")
    .fill("The appointment described in this review belongs to another clinic location.")
  await appealDialog.getByRole("button", { name: "Submit appeal" }).click()
  await expect(review.getByText("Appeal · Incorrect clinic")).toBeVisible()
  await expect(review.getByText("Submitted", { exact: true })).toBeVisible()

  await review.getByRole("button", { name: "View history" }).click()
  const historyDialog = page.getByRole("dialog", { name: "Review history" })
  await expect(historyDialog.getByRole("heading", { name: "Publication history" })).toBeVisible()
  await expect(historyDialog.getByRole("heading", { name: "Clinic response" })).toBeVisible()
  await expect(historyDialog.getByRole("heading", { name: "Appeal history" })).toBeVisible()
})

test("deep-links across locations and persists gallery curation across reload", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(90_000)
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  const receptionAlt = `Reception at Avenora Clinic — İzmir · run ${testInfo.retry + 1}`
  const consultationAlt = `Consultation room at Avenora Clinic — İzmir · run ${testInfo.retry + 1}`
  const exteriorAlt = `Exterior at Avenora Clinic — İzmir · run ${testInfo.retry + 1}`

  await page.getByRole("button", { name: "Notifications, 4 new notifications" }).click()
  await page.getByRole("button", { name: /New message from Leyla Demir/ }).click()

  const locationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  await expect(locationSelector).toHaveAccessibleName(/Current location: Demo data · Avenora Clinic — İzmir/)
  await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeFocused()
  await expect(page.getByText("Opened inquiries at Avenora Clinic — İzmir.")).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()

  const gallery = page.getByRole("region", { name: "Clinic image gallery" })
  await gallery.getByRole("button", { name: "Manage gallery" }).click()
  const galleryEditor = page.getByRole("region", { name: "Manage gallery" })
  await galleryEditor.getByRole("button", { name: "Add images" }).first().click()
  const firstAddImagesDialog = page.getByRole("dialog", { name: "Add images" })
  const firstUploadResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery/media" &&
      response.request().method() === "POST",
  )
  const imageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  )
  await firstAddImagesDialog
    .locator('input[type="file"][aria-label="Choose clinic images"]')
    .setInputFiles({ buffer: imageBuffer, mimeType: "image/png", name: "izmir-reception.png" })
  expect((await firstUploadResponse).status()).toBe(201)
  await expect(firstAddImagesDialog).toBeHidden()
  await galleryEditor.getByRole("textbox", { name: "Alt text" }).fill(receptionAlt)

  await galleryEditor.getByRole("button", { name: "Add images" }).first().click()
  const secondAddImagesDialog = page.getByRole("dialog", { name: "Add images" })
  const secondUploadResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery/media" &&
      response.request().method() === "POST",
  )
  await secondAddImagesDialog
    .locator('input[type="file"][aria-label="Choose clinic images"]')
    .setInputFiles({ buffer: imageBuffer, mimeType: "image/png", name: "izmir-consultation.png" })
  expect((await secondUploadResponse).status()).toBe(201)
  await expect(secondAddImagesDialog).toBeHidden()
  await galleryEditor.getByRole("textbox", { name: "Alt text" }).fill(consultationAlt)

  const firstReorderHandle = galleryEditor.getByRole("button", {
    name: "Reorder image 1. Drag or use arrow keys.",
  })
  const secondGalleryItem = galleryEditor
    .getByRole("button", { name: `Edit image 2: ${consultationAlt}` })
    .locator("xpath=ancestor::li")
  const firstHandleBounds = await firstReorderHandle.boundingBox()
  const secondItemBounds = await secondGalleryItem.boundingBox()
  if (!firstHandleBounds || !secondItemBounds) throw new Error("Gallery reorder geometry is required.")
  await page.mouse.move(
    firstHandleBounds.x + firstHandleBounds.width / 2,
    firstHandleBounds.y + firstHandleBounds.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    secondItemBounds.x + secondItemBounds.width - 2,
    secondItemBounds.y + secondItemBounds.height / 2,
    { steps: 6 },
  )
  await page.mouse.up()
  await expect(galleryEditor.getByRole("status")).toHaveText("Image moved to position 2 of 2.")
  await expect(galleryEditor.getByRole("button", { name: `Edit image 1: ${consultationAlt}` })).toBeVisible()

  const movedReceptionHandle = galleryEditor.getByRole("button", {
    name: "Reorder image 2. Drag or use arrow keys.",
  })
  await movedReceptionHandle.focus()
  await page.keyboard.press("ArrowLeft")
  await expect(galleryEditor.getByRole("button", { name: `Edit image 1: ${receptionAlt}` })).toBeVisible()

  const saveResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery" && response.request().method() === "PUT",
  )
  await galleryEditor.getByRole("button", { name: "Save and return" }).click()
  expect((await saveResponse).status()).toBe(200)
  await expect(galleryEditor).toBeHidden()

  await page.getByRole("button", { name: "Dashboard" }).click()
  await expect(page.getByRole("progressbar", { name: "Public profile progress: 83%" })).toBeVisible()
  await expect(page.getByRole("button", { name: "View details for Add clinic images" })).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await page
    .getByRole("region", { name: "Clinic image gallery" })
    .getByRole("button", { name: "Manage gallery" })
    .click()
  const reopenedEditor = page.getByRole("region", { name: "Manage gallery" })
  await reopenedEditor.getByRole("button", { name: "Add images" }).first().click()
  const thirdAddImagesDialog = page.getByRole("dialog", { name: "Add images" })
  const thirdUploadResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery/media" &&
      response.request().method() === "POST",
  )
  await thirdAddImagesDialog
    .locator('input[type="file"][aria-label="Choose clinic images"]')
    .setInputFiles({ buffer: imageBuffer, mimeType: "image/png", name: "izmir-exterior.png" })
  expect((await thirdUploadResponse).status()).toBe(201)
  await expect(thirdAddImagesDialog).toBeHidden()
  await reopenedEditor.getByRole("textbox", { name: "Alt text" }).fill(exteriorAlt)

  const completeGalleryResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery" && response.request().method() === "PUT",
  )
  await reopenedEditor.getByRole("button", { name: "Save and return" }).click()
  expect((await completeGalleryResponse).status()).toBe(200)
  await expect(reopenedEditor).toBeHidden()

  await page.getByRole("button", { name: "Dashboard" }).click()
  await expect(page.getByRole("progressbar", { name: "Public profile progress: 100%" })).toBeVisible()
  await expect(page.getByRole("button", { name: "View details for Add clinic images" })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  await expect(page.getByRole("progressbar", { name: "Public profile progress: 100%" })).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await page
    .getByRole("region", { name: "Clinic image gallery" })
    .getByRole("button", { name: "Manage gallery" })
    .click()
  const curationEditor = page.getByRole("region", { name: "Manage gallery" })
  await curationEditor
    .getByRole("button", { name: new RegExp(`Edit image \\d+: ${consultationAlt}`) })
    .click()
  await curationEditor.getByRole("button", { name: "Set as main image" }).click()
  await curationEditor.getByRole("button", { name: new RegExp(`Edit image \\d+: ${receptionAlt}`) }).click()
  await curationEditor.getByRole("button", { name: "More image actions" }).click()
  await page.getByRole("menuitem", { name: "Remove image" }).click()
  await curationEditor.getByRole("button", { name: new RegExp(`Edit image \\d+: ${exteriorAlt}`) }).click()
  await curationEditor.getByRole("button", { name: "More image actions" }).click()
  await page.getByRole("menuitem", { name: "Remove image" }).click()
  await curationEditor.getByRole("button", { name: "Save and return" }).click()
  const removalDialog = page.getByRole("alertdialog", { name: "Remove 2 images and save?" })
  const removalResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery" && response.request().method() === "PUT",
  )
  await removalDialog.getByRole("button", { name: "Remove 2 and save" }).click()
  expect((await removalResponse).status()).toBe(200)
  await expect(curationEditor).toBeHidden()

  await page.reload()
  const persistedLocationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  await persistedLocationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  const persistedGallery = page.getByRole("region", { name: "Clinic image gallery" })
  await expect(persistedGallery.getByRole("img", { name: consultationAlt })).toBeVisible()
  await expect(persistedGallery.getByRole("img", { name: receptionAlt })).toHaveCount(0)
  await expect(persistedGallery.getByRole("img", { name: exteriorAlt })).toHaveCount(0)

  await page.getByRole("button", { name: "Dashboard" }).click()
  const clinicPreview = page.getByRole("region", { name: "Dashboard clinic location summary" })
  await expect(clinicPreview.getByText("Avenora Clinic — İzmir")).toBeVisible()
  await expect(clinicPreview.getByRole("img", { name: consultationAlt })).toBeVisible()
  await expect(page.getByRole("progressbar", { name: "Public profile progress: 83%" })).toBeVisible()
  await expect(page.getByRole("button", { name: "View details for Add clinic images" })).toBeVisible()

  await page.reload()
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toHaveAccessibleName(
    /Current location: Demo data · Avenora Clinic — İstanbul/,
  )

  const reloadedLocationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  await reloadedLocationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()

  const cleanupGallery = page.getByRole("region", { name: "Clinic image gallery" })
  await cleanupGallery.getByRole("button", { name: "Manage gallery" }).click()
  const cleanupEditor = page.getByRole("region", { name: "Manage gallery" })
  await cleanupEditor.getByRole("button", { name: "More image actions" }).click()
  await page.getByRole("menuitem", { name: "Remove image" }).click()
  await cleanupEditor.getByRole("button", { name: "Save and return" }).click()
  const cleanupDialog = page.getByRole("alertdialog", { name: "Remove 1 image and save?" })
  const cleanupResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/gallery" && response.request().method() === "PUT",
  )
  await cleanupDialog.getByRole("button", { name: "Remove image and save" }).click()
  expect((await cleanupResponse).status()).toBe(200)
  await expect(cleanupEditor).toBeHidden()
})

test("saves, resumes, reviews and publishes the authenticated clinic profile draft", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()

  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Clinic name" })).toHaveCount(0)
  await page.getByRole("button", { name: "Edit profile" }).click()

  const clinicName = page.getByRole("textbox", { name: "Clinic name" })
  await clinicName.fill("Bosphorus International Clinic")
  await page.getByRole("button", { name: "Save draft" }).first().click()
  await expect(page.getByText("Draft saved.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Review & publish" })).toBeEnabled()

  await page.reload()
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await expect(page.getByText("Published profile is shown.")).toBeVisible()
  await expect(page.getByText("Controlled Bosphorus Clinic")).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue editing" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Review & publish" })).toBeEnabled()
  await page.getByRole("button", { name: "Review & publish" }).click()
  const review = page.getByRole("dialog", { name: "Review and publish" })
  await expect(review.getByText("1 changed field across 1 section")).toBeVisible()
  await review.getByRole("button", { name: "Publish changes" }).click()

  await expect(page.getByText("Bosphorus International Clinic")).toBeVisible()
  await expect(page.getByText("Clinic profile published.")).toBeVisible()
  await expect(page.getByText("Published profile is shown.")).toHaveCount(0)
})

test("guards local profile edits and confirms persistent draft deletion separately", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await page.getByRole("button", { name: /^(?:Edit profile|Continue editing)$/ }).click()

  const description = page.getByRole("textbox", { name: "Description" })
  await description.fill("A locally edited clinic description.")
  await page.getByRole("button", { name: "Cancel editing" }).first().click()
  const leaveDialog = page.getByRole("alertdialog", { name: "Leave profile editing?" })
  await expect(leaveDialog.getByRole("button", { name: "Leave without saving" })).toBeVisible()
  await leaveDialog.getByRole("button", { name: "Keep editing" }).click()
  await expect(description).toHaveValue("A locally edited clinic description.")

  await page.getByRole("button", { name: "Cancel editing" }).first().click()
  const saveAndLeaveDialog = page.getByRole("alertdialog", { name: "Leave profile editing?" })
  await saveAndLeaveDialog.getByRole("button", { name: "Save draft and leave" }).click()
  await expect(saveAndLeaveDialog).toHaveCount(0)
  await expect(page.getByText("Published profile is shown.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Review & publish" })).toBeEnabled()
  await page.getByRole("button", { name: "Continue editing" }).click()
  await page.getByRole("button", { name: "Discard draft" }).click()
  const discardDialog = page.getByRole("alertdialog", { name: "Discard saved draft?" })
  await discardDialog.getByRole("button", { name: "Discard draft" }).click()

  await expect(page.getByText("Draft discarded.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Edit profile" })).toBeVisible()
})

test("routes dashboard tasks into their owning workspace sections", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { name: "View reviews" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Reviews" })).toBeFocused()

  await page.getByRole("button", { name: "Dashboard" }).click()
  await page.getByRole("button", { name: "View details for Add clinic images" }).click()
  const imageDialog = page.getByRole("dialog", { name: "Add clinic images" })
  await expect(imageDialog).toBeVisible()
  await expect(imageDialog.getByRole("heading", { name: "Why this matters" })).toBeVisible()
  await expect(imageDialog.getByRole("heading", { name: "What is missing" })).toBeVisible()
  await expect(imageDialog.getByText("1 main image")).toBeVisible()
  await expect(imageDialog.getByText("2 supporting images")).toBeVisible()
  await imageDialog.getByRole("button", { name: "Edit clinic images" }).click()

  const galleryEditor = page.getByRole("region", { name: "Manage gallery" })
  await expect(galleryEditor).toBeVisible()
  await expect(galleryEditor.getByRole("heading", { name: "Manage gallery" })).toBeFocused()
})

test("persists doctor creation and editing through the authenticated BFF", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await page.getByRole("button", { exact: true, name: "Add doctor" }).click()

  const createDialog = page.getByRole("dialog", { name: "Add doctor" })
  await createDialog.getByRole("textbox", { name: "First name" }).fill("Lea")
  await createDialog.getByRole("textbox", { name: "Last name" }).fill("Fischer")
  await createDialog.getByRole("combobox", { name: "Gender" }).selectOption("female")
  await createDialog.getByRole("combobox", { name: "Qualifications" }).fill("MD")
  await createDialog.getByRole("combobox", { name: "Qualifications" }).press("Enter")
  await createDialog.getByRole("combobox", { name: "Languages" }).fill("Eng")
  await createDialog.getByRole("option", { name: "English" }).click()
  await createDialog.getByRole("textbox", { name: "First name" }).click()
  await createDialog.getByRole("button", { name: "Add specialty" }).click()
  await createDialog.getByRole("combobox", { name: "Specialty 1" }).selectOption("specialty-cardiology")
  await createDialog.getByRole("combobox", { name: "Specialization level 1" }).selectOption("specialist")
  await createDialog.locator('input[type="file"][aria-label="Profile photo"]').setInputFiles({
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
    mimeType: "image/png",
    name: "lea-fischer.png",
  })

  const createDoctorResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/dashboard/doctors" && response.request().method() === "POST",
  )
  const createSpecialtyResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/specialties") && response.request().method() === "POST",
  )
  const imageResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith("/image") && response.request().method() === "POST",
  )
  const activationResponse = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname
    return /^\/api\/dashboard\/doctors\/[^/]+$/u.test(pathname) && response.request().method() === "PATCH"
  })

  await createDialog.getByRole("button", { name: "Add doctor" }).click()
  const [createdDoctor, createdSpecialty, createdImage, activatedDoctor] = await Promise.all([
    createDoctorResponse,
    createSpecialtyResponse,
    imageResponse,
    activationResponse,
  ])
  for (const response of [createdDoctor, createdSpecialty, createdImage, activatedDoctor]) {
    expect(response.ok()).toBe(true)
  }
  await expect(createdImage.json()).resolves.toMatchObject({
    cleanupPending: false,
    profile: {
      firstName: "Lea",
      image: { id: expect.stringContaining("controlled-doctor-image-") },
    },
  })
  await expect(createDialog).not.toBeVisible()

  const createdDoctorName = page.getByText("Lea Fischer", { exact: true })
  await expect(createdDoctorName).toBeVisible()
  const createdDoctorRow = createdDoctorName.locator("..").locator("..")
  await expect(createdDoctorRow.getByText("Active", { exact: true })).toBeVisible()
  await expect(createdDoctorRow.getByText("Cardiology · specialist", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Edit Lea Fischer" }).click()
  const editDialog = page.getByRole("dialog", { name: "Edit doctor" })
  await editDialog.getByRole("switch", { name: "Published profile" }).click()
  await editDialog.getByRole("combobox", { name: "Specialty 1" }).selectOption("specialty-dermatology")

  const updateDoctorResponse = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname
    return /^\/api\/dashboard\/doctors\/[^/]+$/u.test(pathname) && response.request().method() === "PATCH"
  })
  const updateSpecialtyResponse = page.waitForResponse(
    (response) =>
      /\/specialties\/[^/]+$/u.test(new URL(response.url()).pathname) &&
      response.request().method() === "PATCH",
  )
  await editDialog.getByRole("button", { name: "Save doctor" }).click()
  const [updatedDoctor, updatedSpecialty] = await Promise.all([updateDoctorResponse, updateSpecialtyResponse])
  expect(updatedDoctor.ok()).toBe(true)
  expect(updatedSpecialty.ok()).toBe(true)
  await expect(editDialog).not.toBeVisible()
  await expect(createdDoctorRow.getByText("Inactive", { exact: true })).toBeVisible()
  await expect(createdDoctorRow.getByText("Dermatology · specialist", { exact: true })).toBeVisible()
})

test("opens the honest local support prototype from a missing treatment", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await page.getByRole("button", { name: "New treatment" }).click()

  const treatmentDialog = page.getByRole("dialog", { name: "Add treatment" })
  await treatmentDialog.getByRole("button", { name: "Treatment missing?" }).click()

  const supportDialog = page.getByRole("dialog", { name: "Contact support" })
  await expect(supportDialog.getByText("Complete this local demo form. Nothing will be sent.")).toBeVisible()
  await supportDialog.getByRole("combobox", { name: "Category" }).selectOption("Other")
  await supportDialog.getByRole("textbox", { name: "Subject" }).fill("Treatment missing")
  await supportDialog
    .getByRole("textbox", { name: "Message" })
    .fill("Please add this treatment to the platform catalogue.")
  await supportDialog.getByRole("button", { name: "Submit demo request" }).click()

  await expect(
    supportDialog.getByRole("status", {
      name: "Demo complete — no support request was sent or saved.",
    }),
  ).toBeVisible()
})

test("shows authenticated identity and signs out", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
  const menu = page.getByRole("menu", { name: "Account menu" })
  await expect(menu.getByText("Alex Morgan")).toBeVisible()
  await expect(menu.getByText("clinic-staff@example.com")).toBeVisible()
  await menu.getByRole("menuitem", { name: "Sign out" }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
})

test("switches the workspace theme without hydration regressions", async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Hydration failed")) {
      hydrationErrors.push(message.text())
    }
  })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
  const darkModeSwitch = page
    .getByRole("menu", { name: "Account menu" })
    .getByRole("menuitemcheckbox", { name: "Dark mode" })
  await expect(darkModeSwitch).toBeChecked()
  await darkModeSwitch.click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await darkModeSwitch.click()
  await expect(page.locator("html")).toHaveClass(/dark/)

  expect(hydrationErrors).toEqual([])
})

test("rejects invalid credentials without provider details", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("wrong-password")
  const responsePromise = page.waitForResponse("**/api/auth/login")
  await page.getByRole("button", { name: "Sign in" }).click()
  const response = await responsePromise

  expect(response.status()).toBe(401)
  expect(await response.json()).toEqual({ code: "INVALID_CREDENTIALS" })
  await expect(page.getByText("The email address or password is incorrect.")).toBeVisible()
})

test("does not consume callback tokens on GET and rejects invalid links", async ({ page }) => {
  const callbackMethods: string[] = []
  page.on("response", (response) => {
    if (response.url().includes("/api/auth/callback")) callbackMethods.push(response.request().method())
  })

  await page.goto("/auth/callback?token_hash=controlled-invite-token&type=invite&next=/auth/invite/complete")
  await expect(page).toHaveURL(/\/auth\/confirm\?type=invite$/)
  expect(page.url()).not.toContain("token_hash")
  expect(callbackMethods).toEqual([])
  const pendingCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === "clinic_dashboard_pending_email",
  )
  expect(pendingCookie).toMatchObject({ httpOnly: true, path: "/api/auth/callback", sameSite: "Lax" })
  await expect(page.getByRole("heading", { name: "Accept your clinic invitation" })).toBeVisible()

  await page.goto("/auth/callback?token_hash=invalid&type=invite&next=/auth/password/reset/complete")
  await expect(page).toHaveURL(/\/login\?error=invalid-or-expired-link/)
  await expect(page.getByText(/invalid or has expired/)).toBeVisible()
})

test("keeps Supabase and Payload traffic and token material out of the browser", async ({
  context,
  page,
}) => {
  const externalRequests: string[] = []
  const sensitiveValues = ["controlled-access-token", "controlled-invite-token", "controlled-recovery-token"]
  page.on("request", (request) => {
    const origin = new URL(request.url()).origin
    if (origin !== testDashboardOrigin) externalRequests.push(request.url())
  })
  await signIn(page)
  await page.reload()
  const responseBodies = await page.evaluate(async (password) => {
    const htmlResponse = await fetch("/", {
      credentials: "same-origin",
      headers: { Accept: "text/html" },
    })
    const bootstrapResponse = await fetch("/api/dashboard/bootstrap", {
      credentials: "same-origin",
    })
    const csrfToken = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("clinic_dashboard_csrf="))
      ?.slice("clinic_dashboard_csrf=".length)
    if (!csrfToken) throw new Error("Expected a browser-readable CSRF token")
    const loginResponse = await fetch("/api/auth/login", {
      body: JSON.stringify({
        email: "clinic-staff@example.com",
        next: "/",
        password,
      }),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": decodeURIComponent(csrfToken),
      },
      method: "POST",
    })

    return Promise.all([htmlResponse.text(), bootstrapResponse.text(), loginResponse.text()])
  }, testDashboardPassword)
  await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
  await page.waitForLoadState("networkidle")

  const documentText = await page.locator("html").textContent()
  const browserStorage = await page.evaluate(() => ({
    local: Object.values(localStorage),
    session: Object.values(sessionStorage),
  }))
  const cookies = await context.cookies()
  expect(responseBodies).toHaveLength(3)
  for (const sensitiveValue of sensitiveValues) {
    for (const body of responseBodies) expect(body).not.toContain(sensitiveValue)
    expect(documentText).not.toContain(sensitiveValue)
    expect(browserStorage.local).not.toContain(sensitiveValue)
    expect(browserStorage.session).not.toContain(sensitiveValue)
    for (const cookie of cookies) expect(cookie.value).not.toContain(sensitiveValue)
  }
  expect(externalRequests).toEqual([])
})

test("completes invite and recovery links through explicit confirmation", async ({ page }) => {
  for (const flow of ["invite", "recovery"] as const) {
    const completionPath = flow === "invite" ? "/auth/invite/complete" : "/auth/password/reset/complete"
    await page.goto(`/auth/callback?token_hash=controlled-${flow}-token&type=${flow}&next=${completionPath}`)
    await page
      .getByRole("button", {
        name: flow === "invite" ? "Continue invitation" : "Continue password reset",
      })
      .click()
    await expect(page).toHaveURL(new RegExp(`${completionPath.replaceAll("/", "\\/")}$`))
    const completionGrant = (await page.context().cookies()).find(
      (cookie) => cookie.name === "clinic_dashboard_completion_grant",
    )
    expect(completionGrant).toMatchObject({ httpOnly: true, path: "/", sameSite: "Lax" })
    await page.getByLabel("Password", { exact: true }).fill("new-password")
    await page.getByLabel("Confirm password").fill("new-password")
    await page.getByRole("button", { name: "Save password" }).click()
    await expect(page).toHaveURL(new RegExp(`/login\\?status=${flow}-complete$`))
    expect(
      (await page.context().cookies()).find((cookie) => cookie.name === "clinic_dashboard_completion_grant"),
    ).toBeUndefined()
  }
})

test("maps expired sessions, access denial, and outages without leaking clinic data", async ({
  page,
  context,
}) => {
  await signIn(page)
  const sessionCookie = (await context.cookies()).find(
    (cookie) => cookie.name === "clinic_dashboard_controlled_session",
  )
  expect(sessionCookie).toBeDefined()

  await context.addCookies([
    {
      domain: "127.0.0.1",
      name: "clinic_dashboard_controlled_access_state",
      path: "/",
      value: "denied",
    },
  ])
  await page.goto("/")
  await expect(page).toHaveURL(/\/access$/)
  await expect(page.getByRole("heading", { name: "Clinic access pending" })).toBeVisible()
  await expect(page.getByText("Controlled Clinic")).toHaveCount(0)

  await context.addCookies([
    {
      domain: "127.0.0.1",
      name: "clinic_dashboard_controlled_access_state",
      path: "/",
      value: "outage",
    },
  ])
  await page.goto("/")
  await expect(page).toHaveURL(/\/access\?state=temporarily-unavailable$/)
  await expect(page.getByRole("heading", { name: "Service temporarily unavailable" })).toBeVisible()

  await context.clearCookies({ name: "clinic_dashboard_controlled_session" })
  await page.goto("/")
  await expect(page).toHaveURL(/\/login$/)
})
