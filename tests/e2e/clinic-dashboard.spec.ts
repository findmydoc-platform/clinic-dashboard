import { expect, test, type Locator, type Page } from "@playwright/test"

const testDashboardPassword = "clinic-dashboard-test"

async function signIn(page: Page) {
  const response = await page.goto("/")
  expect(response?.headers()["x-robots-tag"]).toContain("noindex")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Password").fill(testDashboardPassword)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  await page.waitForLoadState("networkidle")
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

function parseSrgbColor(color: string) {
  const srgb = color.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (srgb) return srgb.slice(1, 4).map(Number)

  const rgb = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
  if (rgb) return rgb.slice(1, 4).map((channel) => Number(channel) / 255)

  throw new Error(`Unsupported computed color: ${color}`)
}

function relativeLuminance(color: string) {
  const [red, green, blue] = parseSrgbColor(color).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

async function getContrastRatio(foreground: Locator, background: Locator = foreground) {
  const foregroundColor = await foreground.evaluate((element) => getComputedStyle(element).color)
  const backgroundColor = await background.evaluate((element) => getComputedStyle(element).backgroundColor)
  const lighter = Math.max(relativeLuminance(foregroundColor), relativeLuminance(backgroundColor))
  const darker = Math.min(relativeLuminance(foregroundColor), relativeLuminance(backgroundColor))

  return (lighter + 0.05) / (darker + 0.05)
}

async function expectCursor(locator: Locator, cursor: string) {
  await expect(locator).toBeVisible()
  expect(await locator.evaluate((element) => getComputedStyle(element).cursor)).toBe(cursor)
}

test("uses global cursor semantics for interactive and disabled controls", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await page.goto("/")

  await expectCursor(page.getByLabel("Password"), "text")
  await expectCursor(page.getByRole("button", { name: "Sign in" }), "pointer")

  await page.getByLabel("Password").fill(testDashboardPassword)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/$/)

  await expectCursor(page.getByRole("button", { name: "Dashboard" }), "pointer")
  await expectCursor(page.getByRole("switch", { name: "Full interface" }), "pointer")

  await page.getByRole("button", { name: "Clinic profile" }).click()
  await expectCursor(page.getByLabel("Clinic name"), "not-allowed")
})

test("renders all fixture workspaces and dialogs without backend behavior", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  const interfaceModeSwitch = page.getByRole("switch", { name: "Full interface" })
  await expect(interfaceModeSwitch).not.toBeChecked()
  await expect(page.getByRole("main").getByText(/demo|fixture/i)).toHaveCount(0)
  await expect(page.getByRole("group", { name: "Reporting period" })).toHaveCount(0)
  await expect(
    page.getByLabel("Desktop clinic navigation").getByText("Prototype", { exact: true }),
  ).toBeVisible()

  await interfaceModeSwitch.click()
  await expect(interfaceModeSwitch).toBeChecked()
  await expect(page.getByRole("group", { name: "Reporting period" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Notifications, 2 new notifications" })).toBeVisible()
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/dashboard-full-interface.png" })
  await page.reload()
  await expect(page.getByRole("switch", { name: "Full interface" })).toBeChecked()
  await expect(page.getByRole("group", { name: "Reporting period" })).toBeVisible()
  await page.getByRole("switch", { name: "Full interface" }).click()
  await expect(page.getByRole("switch", { name: "Full interface" })).not.toBeChecked()
  await expect(page.getByRole("group", { name: "Reporting period" })).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/dashboard-desktop.png" })

  await page.getByRole("button", { name: "Messages" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Write a message" })).toHaveCount(0)
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/messages-desktop.png" })

  const patientTrigger = page.getByRole("button", { name: "View patient profile" })
  await patientTrigger.click()
  await expect(page.getByRole("dialog", { name: "Patient profile" })).toBeVisible()
  await expect(page.getByText("Medical notes")).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/patient-profile-desktop.png" })
  await page.getByRole("dialog", { name: "Patient profile" }).getByText("Close", { exact: true }).click()
  await expect(patientTrigger).toBeFocused()

  await page.getByRole("button", { exact: true, name: "Reviews" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Reviews" })).toBeVisible()
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/reviews-desktop.png" })

  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Clinic profile" })).toBeVisible()
  await expect(page.getByLabel("Clinic name")).toBeDisabled()
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/profile-desktop.png" })

  const treatmentTrigger = page.getByRole("button", { name: "New treatment" })
  await treatmentTrigger.click()
  await expect(page.getByRole("dialog", { name: "Create new treatment" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Save treatment" })).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/treatment-dialog-desktop.png" })
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(treatmentTrigger).toBeFocused()

  const teamTrigger = page.getByRole("button", { name: "Add team member" })
  await teamTrigger.click()
  await expect(page.getByRole("dialog", { name: "Add team member" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add team member", exact: true })).toHaveCount(1)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/team-dialog-desktop.png" })
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(teamTrigger).toBeFocused()

  const health = await page.request.get("/api/health")
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toEqual({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
})

test("switches complete reporting snapshots and manages local notifications", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("switch", { name: "Full interface" }).click()

  await expect(page.getByText("+12.0% vs. previous 30 days")).toBeVisible()
  await expect(page.getByText("5 new reviews in the last 30 days")).toBeVisible()

  await page.getByRole("button", { name: "7 days" }).click()
  await expect(page.getByRole("heading", { name: "Conversion funnel (7 days)" })).toBeVisible()
  await expect(page.getByText("+10.1% vs. previous 7 days")).toBeVisible()
  await expect(page.getByText("1 new review in the last 7 days")).toBeVisible()
  await expect(page.getByRole("main").getByText("4,680")).toHaveCount(3)

  await page.getByRole("button", { name: "90 days" }).click()
  await expect(page.getByRole("heading", { name: "Conversion funnel (90 days)" })).toBeVisible()
  await expect(page.getByText("+9.6% vs. previous 90 days")).toBeVisible()
  await expect(page.getByText("17 new reviews in the last 90 days")).toBeVisible()
  await expect(page.getByRole("main").getByText("53,680")).toHaveCount(3)

  const notificationButton = page.getByRole("button", {
    name: "Notifications, 2 new notifications",
  })
  await notificationButton.click()
  const notifications = page.getByRole("dialog", { name: "Notifications" })
  await expect(notifications.getByText("New message from Lukas Weber")).toBeVisible()
  await expect(notifications.getByText("New 3-star review needs a response")).toBeVisible()
  await page.screenshot({ path: "output/playwright/clinic-dashboard/dashboard-notifications-open.png" })
  await page.setViewportSize({ height: 700, width: 320 })
  await expectNoHorizontalOverflow(page)
  await expect(notifications).toBeVisible()
  const notificationBounds = await notifications.boundingBox()
  expect(notificationBounds?.y).toBeGreaterThanOrEqual(0)
  expect((notificationBounds?.y ?? 0) + (notificationBounds?.height ?? 0)).toBeLessThanOrEqual(684)
  const periodButtons = page.getByRole("group", { name: "Reporting period" }).getByRole("button")
  for (let index = 0; index < (await periodButtons.count()); index += 1) {
    const bounds = await periodButtons.nth(index).boundingBox()
    expect(bounds?.height).toBeGreaterThanOrEqual(44)
  }
  await page.screenshot({ path: "output/playwright/clinic-dashboard/dashboard-notifications-mobile.png" })
  await page.setViewportSize({ height: 900, width: 1280 })
  await notifications.getByRole("button", { name: "Mark all as read" }).click()
  const notificationStatus = notifications.getByRole("status")
  await expect(notificationStatus.getByText("You're up to date")).toBeVisible()
  await expect(notificationStatus).toBeFocused()
  const emptyNotificationButton = page.getByRole("button", {
    name: "Notifications, no new notifications",
  })
  await expect(emptyNotificationButton).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(emptyNotificationButton).toBeFocused()
  await page.reload()
  await expect(page.getByRole("switch", { name: "Full interface" })).toBeChecked()
  await expect(page.getByRole("button", { name: "Notifications, no new notifications" })).toBeVisible()
})

test("opens the account menu and signs out", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  const trigger = page.getByRole("button", { name: "Open account menu for Sarah Schmidt" })
  await trigger.click()

  const menu = page.getByRole("dialog", { name: "Account menu" })
  await expect(menu.getByText("Sarah Schmidt")).toBeVisible()
  await expect(menu.getByText("Clinic administrator")).toBeVisible()
  await expect(menu.getByRole("switch", { name: "Dark mode" })).toBeVisible()
  await menu.getByRole("button", { name: "Sign out" }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
})

test("switches themes without hydration or dark-mode contrast regressions", async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Hydration failed")) {
      hydrationErrors.push(message.text())
    }
  })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { name: "Open account menu for Sarah Schmidt" }).click()
  const menu = page.getByRole("dialog", { name: "Account menu" })
  const darkModeSwitch = menu.getByRole("switch", { name: "Dark mode" })
  await expect(darkModeSwitch).toBeChecked()
  await page.screenshot({ path: "output/playwright/clinic-dashboard/account-menu-dark.png" })

  await darkModeSwitch.click()
  await expect(darkModeSwitch).not.toBeChecked()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await darkModeSwitch.click()
  await expect(darkModeSwitch).toBeChecked()
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.getByRole("button", { name: "Messages" }).click()
  const activeConversation = page.getByRole("main").locator('[aria-current="page"]')
  await expect(activeConversation).toBeVisible()
  await expect(activeConversation.locator("strong")).toBeVisible()
  expect(
    await getContrastRatio(activeConversation.locator("strong"), activeConversation),
  ).toBeGreaterThanOrEqual(4.5)
  const totalUnread = page.getByText("1 new", { exact: true })
  const conversationUnread = page.getByLabel("1 unread message")
  const outgoingMessage = page.getByText(
    "Hello Mr Weber, thank you for your interest. For an initial assessment we normally need photos of the affected areas.",
    { exact: true },
  )
  await expect(totalUnread).toBeVisible()
  await expect(conversationUnread).toBeVisible()
  await expect(outgoingMessage).toBeVisible()
  expect(await getContrastRatio(totalUnread)).toBeGreaterThanOrEqual(4.5)
  expect(await getContrastRatio(conversationUnread)).toBeGreaterThanOrEqual(4.5)
  expect(await getContrastRatio(outgoingMessage)).toBeGreaterThanOrEqual(4.5)
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/messages-dark.png" })

  await page.getByRole("button", { name: "Reviews" }).click()
  for (const status of ["Answered", "Open", "Under review"]) {
    const statusBadge = page.getByRole("main").getByText(status, { exact: true })
    await expect(statusBadge).toBeVisible()
    expect(await getContrastRatio(statusBadge)).toBeGreaterThanOrEqual(4.5)
  }
  const underReviewCard = page.locator('[data-review-status="Under review"]')
  const underReviewHeading = underReviewCard.getByRole("heading", { name: "Janine Doe" })
  expect(await getContrastRatio(underReviewHeading, underReviewCard)).toBeGreaterThanOrEqual(4.5)
  await page.waitForTimeout(200)
  await page.screenshot({ fullPage: true, path: "output/playwright/clinic-dashboard/reviews-dark.png" })

  await page.getByRole("button", { name: "Clinic profile" }).click()
  const galleryBadge = page.getByText("+12 more images")
  await expect(galleryBadge).toBeVisible()
  expect(await getContrastRatio(galleryBadge)).toBeGreaterThanOrEqual(4.5)
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/profile-dark.png" })

  await page.getByRole("switch", { name: "Full interface" }).click()
  await page.getByRole("button", { name: "Contact support" }).click()
  const supportDialog = page.getByRole("dialog", { name: "Contact support" })
  await expect(supportDialog).toBeVisible()
  await expect(supportDialog.getByText("Optional screenshot")).toBeVisible()
  await page.screenshot({ path: "output/playwright/clinic-dashboard/contact-support-dark.png" })

  expect(hydrationErrors).toEqual([])
})

test("supports the fixture-backed messages prototype across desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("switch", { name: "Full interface" }).click()
  await page.getByRole("button", { name: "Messages" }).click()

  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible()
  await expect(page.getByText("1 new")).toBeVisible()
  await expect(page.getByText("Hair transplant").first()).toBeVisible()
  await expect(page.getByText(/Treatment:/)).toBeVisible()
  await page.getByRole("button", { name: "Conversation menu" }).click()
  await page.getByRole("menuitem", { name: "Mark as read" }).click()
  await expect(page.getByText("All read")).toBeVisible()
  await expect(page.getByText("1 new", { exact: true })).toHaveCount(0)
  await expect(page.getByLabel("1 unread message")).toHaveCount(0)
  await page.screenshot({
    path: "output/playwright/clinic-dashboard/messages-full-interface-desktop.png",
  })

  const search = page.getByLabel("Search conversations")
  await search.fill("Markus")
  await page.getByRole("button", { name: /Markus Schmidt/ }).click()
  await expect(page.getByRole("heading", { level: 2, name: "Markus Schmidt" })).toBeVisible()
  await expect(page.getByText("Conversation preview")).toBeVisible()
  await expect(page.getByText("Full conversation details are not available in this prototype.")).toBeVisible()
  await expect(page.getByLabel("Write a message")).toHaveCount(0)
  await page.screenshot({
    path: "output/playwright/clinic-dashboard/messages-search-preview-desktop.png",
  })

  await search.clear()
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  await expect(page.getByText("All read")).toBeVisible()
  const composer = page.getByLabel("Write a message")
  await composer.fill("We can review the photos tomorrow.")
  await composer.press("Enter")
  await expect(page.getByText("We can review the photos tomorrow.")).toBeVisible()
  await expect(composer).toHaveValue("")

  await page.getByRole("button", { name: "Conversation menu" }).click()
  await page.getByRole("menuitem", { name: "Mark as unread" }).click()
  await expect(page.getByText("1 new")).toBeVisible()

  await page.setViewportSize({ height: 844, width: 390 })
  const backButton = page.getByRole("button", { name: "Back to conversations" })
  await expect(backButton).toBeVisible()
  await backButton.click()
  const activeConversation = page.getByRole("button", { name: /Lukas Weber/ })
  await expect(activeConversation).toBeFocused()
  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Write a message" })).toHaveCount(0)
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/messages-mobile-inbox.png" })

  await activeConversation.click()
  const mobileThreadHeading = page.getByRole("heading", { level: 1, name: "Lukas Weber" })
  await expect(mobileThreadHeading).toBeFocused()
  await expect(page.getByText(/Treatment:/)).toBeVisible()
  const mobileComposer = page.getByLabel("Write a message")
  await mobileComposer.fill("Thank you, we will review the photos.")
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/messages-mobile-thread-draft.png" })
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByText("Thank you, we will review the photos.")).toBeVisible()
  await expect(mobileComposer).toHaveValue("")
})

test("supports the complete responsive and keyboard presentation matrix", async ({ page }) => {
  await signIn(page)

  const viewports = [
    { height: 700, width: 320 },
    { height: 700, width: 375 },
    { height: 900, width: 640 },
    { height: 1024, width: 768 },
    { height: 900, width: 1024 },
    { height: 900, width: 1280 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    if (viewport.width < 768) {
      const trigger = page.getByRole("button", { name: "Open navigation" })
      await trigger.focus()
      await page.keyboard.press("Enter")
      const navigation = page.getByRole("dialog", { name: "Clinic navigation" })
      await expect(navigation).toBeVisible()
      await expect
        .poll(async () => Math.abs((await navigation.boundingBox())?.x ?? Number.POSITIVE_INFINITY))
        .toBeLessThanOrEqual(1)
      const navigationBounds = await navigation.boundingBox()
      expect(navigationBounds).not.toBeNull()
      expect(navigationBounds?.x).toBe(0)
      expect(navigationBounds?.y).toBe(0)
      expect(navigationBounds?.width).toBe(288)
      expect(navigationBounds?.height).toBe(viewport.height)
      await navigation.getByRole("button", { name: "Messages" }).click()
      await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible()
      await expect(trigger).toBeFocused()
      await expectNoHorizontalOverflow(page)

      const buttons = page.locator("[data-clinic-dashboard-root] button:visible")
      for (let index = 0; index < (await buttons.count()); index += 1) {
        const box = await buttons.nth(index).boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
          expect(box.width).toBeGreaterThanOrEqual(44)
        }
      }
    }
  }

  await page.setViewportSize({ height: 700, width: 320 })
  await page.goto("/")
  await page.getByRole("button", { name: "Open navigation" }).click()
  await page
    .getByRole("dialog", { name: "Clinic navigation" })
    .getByRole("button", { name: "Clinic profile" })
    .click()
  await page.getByRole("button", { name: "New treatment" }).click()
  const dialog = page.getByRole("dialog", { name: "Create new treatment" })
  await expect(dialog).toBeVisible()
  const headerBefore = await dialog.getByRole("heading", { name: "Create new treatment" }).boundingBox()
  await dialog
    .locator("div")
    .filter({ has: page.getByLabel("Treatment name") })
    .first()
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
  const headerAfter = await dialog.getByRole("heading", { name: "Create new treatment" }).boundingBox()
  expect(headerAfter?.y).toBe(headerBefore?.y)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/treatment-dialog-mobile-320x700.png" })
  await expectNoHorizontalOverflow(page)
})

test("supports truthful lower-dashboard prototype interactions", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await expect(page.getByRole("button", { name: "Review images" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Review team" })).toBeVisible()
  await expect(page.getByRole("button", { name: /^View details/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Download profile views" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Open preview" })).toHaveCount(0)
  await expect(page.getByText("1 response pending")).toBeVisible()

  const firstChartPoint = page.getByRole("img", { name: "September 13: 94 profile views" })
  const firstChartPointTarget = firstChartPoint.locator("circle").first()
  await firstChartPointTarget.hover()
  await expect(page.getByRole("tooltip", { name: "September 13: 94 profile views" })).toBeVisible()
  await firstChartPointTarget.click()
  await expect(firstChartPoint).toBeFocused()
  await expect(page.getByRole("tooltip", { name: "September 13: 94 profile views" })).toBeVisible()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("img", { name: "September 14: 98 profile views" })).toBeFocused()

  await page.getByRole("button", { name: "View reviews" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Reviews" })).toBeFocused()

  await page.getByRole("button", { name: "Dashboard" }).click()
  await page.getByRole("button", { name: "Review images" }).click()
  const imageDialog = page.getByRole("dialog", { name: "Missing images" })
  await expect(imageDialog).toBeVisible()
  await imageDialog.getByRole("button", { name: "Open image gallery" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Clinic profile" })).toBeVisible()
  await expect(page.locator("#clinic-profile-gallery")).toBeFocused()

  await page.getByRole("button", { name: "Dashboard" }).click()
  const teamTrigger = page.getByRole("button", { name: "Review team" })
  await teamTrigger.click()
  const teamDialog = page.getByRole("dialog", { name: "Open doctor profiles" })
  await page.keyboard.press("Escape")
  await expect(teamTrigger).toBeFocused()
  await teamTrigger.click()
  await teamDialog.getByRole("button", { name: "Open doctors and team" }).click()
  await expect(page.locator("#clinic-profile-team")).toBeFocused()

  await page.getByRole("button", { name: "Dashboard" }).click()
  await page.getByRole("switch", { name: "Full interface" }).click()
  await expect(page.getByRole("button", { name: "Download profile views" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Open preview" })).toBeVisible()
  const profileProgress = page.getByRole("heading", { name: "Profile progress" })
  await profileProgress.evaluate((element) => element.scrollIntoView({ block: "start" }))
  await page.screenshot({
    path: "output/playwright/clinic-dashboard/dashboard-lower-full-interface-desktop.png",
  })

  const certificateTask = page.getByRole("group", {
    name: "Certificates required profile task",
  })
  const certificateTrigger = certificateTask.getByRole("button", {
    name: "View details for Certificates required",
  })
  await certificateTrigger.click()
  const certificateDialog = page.getByRole("dialog", { name: "Certificates required" })
  await expect(certificateDialog).toBeVisible()
  await expect(
    certificateDialog.getByText("Certificate management is not available yet.", { exact: false }),
  ).toBeVisible()
  await expect(certificateDialog.getByLabel("Status: Open, High priority")).toBeVisible()
  await expect(certificateDialog.getByText("Status", { exact: true })).toHaveCount(0)
  await expect(certificateDialog.getByRole("button", { name: /Open/ })).toHaveCount(0)
  const desktopDialogBounds = await certificateDialog.boundingBox()
  expect(desktopDialogBounds).not.toBeNull()
  expect(
    Math.abs((desktopDialogBounds?.x ?? 0) + (desktopDialogBounds?.width ?? 0) / 2 - 1280 / 2),
  ).toBeLessThanOrEqual(2)
  expect(
    Math.abs((desktopDialogBounds?.y ?? 0) + (desktopDialogBounds?.height ?? 0) / 2 - 900 / 2),
  ).toBeLessThanOrEqual(2)
  await page.screenshot({
    path: "output/playwright/clinic-dashboard/profile-task-dialog-desktop-1280x900.png",
  })
  await page.keyboard.press("Escape")
  await expect(certificateTrigger).toBeFocused()

  const expiryTask = page.getByRole("group", { name: "Certificate expiry profile task" })
  const expiryTrigger = expiryTask.getByRole("button", {
    name: "View details for Certificate expiry",
  })
  await expiryTrigger.click()
  await expect(page.getByRole("dialog", { name: "Certificate expiry" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(expiryTrigger).toBeFocused()

  await page.setViewportSize({ height: 500, width: 320 })
  await certificateTrigger.click()
  await expect(certificateDialog).toBeVisible()
  const dialogBounds = await certificateDialog.boundingBox()
  const footer = certificateDialog.locator("footer")
  await expect(footer).toBeVisible()
  await expect(footer.getByRole("button", { name: "Close" })).toBeVisible()
  expect(dialogBounds).not.toBeNull()
  expect(Math.abs((dialogBounds?.x ?? 0) + (dialogBounds?.width ?? 0) / 2 - 320 / 2)).toBeLessThanOrEqual(2)
  expect(Math.abs((dialogBounds?.y ?? 0) + (dialogBounds?.height ?? 0) / 2 - 500 / 2)).toBeLessThanOrEqual(2)
  await page.screenshot({
    path: "output/playwright/clinic-dashboard/profile-task-dialog-mobile-320x500.png",
  })
  await expectNoHorizontalOverflow(page)
})

test("supports future-ready reviews and clinic profile prototype mutations", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("switch", { name: "Full interface" }).click()

  await page.getByRole("button", { exact: true, name: "Reviews" }).click()
  const openReview = page
    .locator('[data-review-status="Open"]')
    .filter({ hasText: "Anonymous patient" })
    .first()
  await openReview.getByRole("button", { name: "Respond" }).click()
  const responseDialog = page.getByRole("dialog", { name: "Respond to review" })
  await responseDialog
    .getByLabel("Public response")
    .fill("Thank you for the feedback. We will review the reception process with our team.")
  await responseDialog.getByRole("button", { name: "Save response" }).click()
  await expect(page.getByText("Review response saved.")).toBeVisible()
  await expect(page.getByText("We will review the reception process", { exact: false })).toBeVisible()

  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  await page.getByRole("button", { exact: true, name: "Reviews" }).click()
  await expect(page.getByText("We will review the reception process", { exact: false })).toBeVisible()

  await page.getByRole("combobox", { name: /^Status/ }).selectOption("Under review")
  await page.getByRole("button", { name: "Apply filters" }).click()
  await expect(page.getByRole("heading", { name: "Janine Doe" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Responses locked" }).first()).toBeDisabled()

  await page.setViewportSize({ height: 844, width: 390 })
  await expect(page.getByRole("button", { name: "Show filters" })).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/reviews-prototype-mobile.png" })

  await page.setViewportSize({ height: 900, width: 1280 })
  await page.getByRole("button", { exact: true, name: "Clinic profile" }).click()
  const clinicName = page.getByLabel("Clinic name")
  await clinicName.fill("Berlin Health Clinic Prototype")
  await expect(page.getByText("Unsaved fixture profile changes")).toBeVisible()
  await page.getByRole("button", { name: "Save changes" }).first().click()
  await expect(page.getByText("Fixture profile saved as revision 2.")).toBeVisible()

  await page.getByRole("button", { name: "Add", exact: true }).click()
  const specialtyDialog = page.getByRole("dialog", { name: "Add specialty" })
  await specialtyDialog.getByRole("combobox", { name: /^Specialty/ }).selectOption("Aesthetic medicine")
  await specialtyDialog.getByRole("button", { name: "Add specialty" }).click()
  await expect(page.getByText("Aesthetic medicine")).toBeVisible()

  await page.setViewportSize({ height: 844, width: 390 })
  await page.getByRole("button", { name: "New treatment" }).click()
  const treatmentDialog = page.getByRole("dialog", { name: "Create new treatment" })
  await treatmentDialog.getByLabel("Treatment name").fill("Express whitening")
  await treatmentDialog.getByLabel("Category").selectOption("Dentistry")
  await treatmentDialog.getByLabel("Duration (minutes)").fill("30")
  await treatmentDialog.getByLabel("Price (€)").fill("180")
  await treatmentDialog
    .getByLabel("Description")
    .fill("A focused whitening appointment with consultation and aftercare guidance.")
  await treatmentDialog.getByRole("button", { name: "Save treatment" }).click()
  await expect(page.getByText("Express whitening")).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/profile-prototype-mobile.png" })
})

test("supports responsive direct and form-based support contact", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("switch", { name: "Full interface" }).click()

  const desktopTrigger = page.getByRole("button", { name: "Contact support" })
  await desktopTrigger.click()
  const dialog = page.getByRole("dialog", { name: "Contact support" })
  await expect(dialog.getByRole("link", { name: /Call/ })).toHaveAttribute("href", "tel:+493055500182")
  await expect(dialog.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
    "href",
    "https://wa.me/493055500182",
  )
  await expect(dialog.getByRole("link", { name: /Email/ })).toHaveAttribute(
    "href",
    "mailto:support@example.com",
  )
  await dialog.getByRole("button", { name: "Send support request" }).click()
  await expect(dialog.getByText("Choose a support category.")).toBeVisible()
  await expect(dialog.getByRole("combobox", { name: "Category" })).toBeFocused()
  await dialog.getByRole("combobox", { name: "Category" }).selectOption("Technical issue")
  await dialog.getByLabel("Subject").fill("Review refresh issue")
  await dialog
    .getByRole("textbox", { name: "Message" })
    .fill("The review page does not refresh after a response is saved.")
  await dialog.getByLabel("Preferred reply channel").selectOption("WhatsApp")
  await dialog.getByLabel("Optional screenshot").setInputFiles({
    buffer: Buffer.from("prototype screenshot"),
    mimeType: "image/png",
    name: "review-refresh.png",
  })
  await expect(dialog.getByText("review-refresh.png")).toBeVisible()
  await page.screenshot({ path: "output/playwright/clinic-dashboard/contact-support-desktop.png" })
  await dialog.getByRole("button", { name: "Send support request" }).click()
  await expect(dialog.getByText("FMD-1042")).toBeVisible()
  await dialog.getByRole("button", { name: "Done" }).click()
  await expect(desktopTrigger).toBeFocused()

  await page.setViewportSize({ height: 700, width: 320 })
  const navigationTrigger = page.getByRole("button", { name: "Open navigation" })
  await navigationTrigger.click()
  const navigation = page.getByRole("dialog", { name: "Clinic navigation" })
  await navigation.getByRole("button", { name: "Contact support" }).click()
  await expect(dialog).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/contact-support-mobile.png" })
  await page.keyboard.press("Escape")
  await expect(navigationTrigger).toBeFocused()
})
