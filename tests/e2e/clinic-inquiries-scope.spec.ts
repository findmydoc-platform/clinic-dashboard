import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.waitForLoadState("networkidle")
  await page.getByRole("button", { name: "Inquiries", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Inquiries", exact: true })).toBeVisible()
}
async function switchTo(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(name) }).click()
}

test("retains draft decisions and isolates inquiry commands, attachments and delayed details", async ({
  page,
  context,
  baseURL,
}) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page)
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const detail = page.getByRole("region", { name: "Inquiry from Lukas Weber" })
  await expect(detail).toBeVisible()
  const reply = detail.getByRole("textbox", { name: "Reply to patient" })
  await reply.fill("Original clinic unsent reply.")
  await switchTo(page, "Second Controlled Clinic")
  const departure = page.getByRole("alertdialog")
  await expect(departure).toBeVisible()
  await expect(departure).toHaveCSS("opacity", "1")
  await expect(departure).toHaveCSS("background-color", "rgb(255, 255, 255)")
  await page.screenshot({
    path: "output/playwright/235-inquiry-departure-light.png",
    fullPage: true,
    animations: "disabled",
  })
  await departure.getByRole("button", { name: "Keep editing" }).click()
  await expect(reply).toHaveValue("Original clinic unsent reply.")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await detail.getByLabel("Choose reply attachment").setInputFiles({
    buffer: Buffer.from("synthetic inquiry attachment"),
    mimeType: "application/pdf",
    name: "clinic-scope.pdf",
  })
  await expect(detail.getByText("Uploading clinic-scope.pdf.")).not.toBeVisible()
  await expect(detail.getByText("clinic-scope.pdf", { exact: true })).toBeVisible()
  await reply.fill("Scoped reply persisted in the original clinic.")
  await detail.getByRole("button", { name: "Send reply" }).click()
  await expect(detail.getByText("Scoped reply persisted in the original clinic.")).toBeVisible()
  await detail.getByRole("button", { name: "Internal note", exact: true }).click()
  await detail.getByRole("textbox", { name: "Internal note" }).fill("Scoped internal note.")
  await detail.getByRole("button", { name: "Add note" }).click()
  await expect(detail.getByText("Scoped internal note.")).toBeVisible()
  await detail.getByRole("button", { name: "More actions" }).click()
  await page.getByRole("menuitem", { name: "Close conversation", exact: true }).click()
  const closeDialog = page.getByRole("dialog", { name: "Close conversation?", exact: true })
  await closeDialog.getByRole("textbox", { name: "Close reason" }).fill("Completed in the original clinic.")
  await closeDialog.getByRole("button", { name: "Close conversation", exact: true }).click()
  await expect(detail.getByText("Conversation closed", { exact: true })).toBeVisible()
  await detail.getByRole("button", { name: "More actions" }).click()
  await page.getByRole("menuitem", { name: "Reopen conversation", exact: true }).click()
  await expect(detail.getByText("Conversation open", { exact: true })).toBeVisible()
  await detail.getByRole("button", { name: "Reply to patient", exact: true }).click()
  await reply.fill("Discard before switching.")
  await switchTo(page, "Second Controlled Clinic")
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /Discard/ })
    .click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=messages/)
  await expect(page.getByRole("button", { name: /Second clinic Lukas Weber/ })).toBeVisible()
  await expect(page.getByText("Scoped internal note.")).toHaveCount(0)
  const first = await page.request.get("/api/dashboard/clinics/controlled-clinic/inquiries")
  const second = await page.request.get("/api/dashboard/clinics/controlled-second-clinic/inquiries")
  const firstQueue = await first.json()
  const secondQueue = await second.json()
  expect(firstQueue.inquiries[0].id).not.toBe(secondQueue.inquiries[0].id)
  expect((await page.request.get("/api/dashboard/clinics/foreign-clinic/inquiries")).status()).toBe(403)
  expect(
    (
      await page.request.get(
        "/api/dashboard/clinics/controlled-second-clinic/inquiries/detail?inquiryId=inquiry-lukas-weber",
      )
    ).status(),
  ).toBe(404)
  await page.getByRole("button", { name: /Second clinic Lukas Weber/ }).click()
  const secondDetail = page.getByRole("region", { name: "Inquiry from Second clinic Lukas Weber" })
  await expect(secondDetail).toBeVisible()
  for (const width of [320, 375, 640, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(secondDetail).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: `output/playwright/235-inquiry-${width}-light.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 375, height: 540 })
  await secondDetail.getByRole("textbox", { name: "Reply to patient" }).focus()
  await expect(secondDetail.getByRole("textbox", { name: "Reply to patient" })).toBeFocused()
  await page.screenshot({ path: "output/playwright/235-inquiry-short-height-keyboard.png", fullPage: true })
  await page.getByRole("button", { name: /Open account menu/ }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await page.keyboard.press("Escape")
  await page.screenshot({ path: "output/playwright/235-inquiry-dark.png", fullPage: true })
  expect(runtimeErrors).toEqual([])
})

test("rejects a late detail from the previous clinic", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page)
  let enter!: () => void
  let release!: () => void
  const entered = new Promise<void>((resolve) => {
    enter = resolve
  })
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/api/dashboard/clinics/controlled-clinic/inquiries/detail?**", async (route) => {
    const response = await route.fetch()
    enter()
    await released
    await route.fulfill({ response }).catch(() => undefined)
  })
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  await entered
  await switchTo(page, "Second Controlled Clinic")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
  release()
  await page.getByRole("button", { name: /Second clinic Lukas Weber/ }).click()
  await expect(page.getByRole("region", { name: "Inquiry from Second clinic Lukas Weber" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Inquiry from Lukas Weber", exact: true })).toHaveCount(0)
  await page.screenshot({
    path: "output/playwright/235-inquiry-late-detail.png",
    fullPage: true,
    animations: "disabled",
  })
})
