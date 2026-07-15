import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  const response = await page.goto("/")
  expect(response?.headers()["x-robots-tag"]).toContain("noindex")
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel("Password").fill("findmydoc")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

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
  await expect(page.getByLabel("Write a message")).toHaveCount(0)
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/messages-desktop.png" })

  const patientTrigger = page.getByRole("button", { name: "View patient profile" })
  await patientTrigger.click()
  await expect(page.getByRole("dialog", { name: "Patient profile" })).toBeVisible()
  await expect(page.getByText("Medical notes")).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/patient-profile-desktop.png" })
  await page.getByRole("dialog", { name: "Patient profile" }).getByText("Close", { exact: true }).click()
  await expect(patientTrigger).toBeFocused()

  await page.getByRole("button", { name: "Reviews" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Reviews" })).toBeVisible()
  await page.waitForTimeout(200)
  await page.screenshot({ path: "output/playwright/clinic-dashboard/reviews-desktop.png" })

  await page.getByRole("button", { name: "Clinic profile" }).click()
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
