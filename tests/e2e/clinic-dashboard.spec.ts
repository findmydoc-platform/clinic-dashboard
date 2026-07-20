import { expect, test, type Page } from "@playwright/test"

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

test("authenticates and exposes the complete workspace shell", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  const interfaceModeSwitch = page.getByRole("switch", { name: "Demo scope" })
  await expect(interfaceModeSwitch).not.toBeChecked()
  await interfaceModeSwitch.click()
  await expect(interfaceModeSwitch).toBeChecked()
  await expect(page.getByRole("group", { name: "Reporting period" })).toBeVisible()

  for (const section of ["Messages", "Reviews", "Clinic profile"] as const) {
    await page.getByRole("button", { exact: true, name: section }).click()
    await expect(page.getByRole("heading", { level: 1, name: section })).toBeVisible()
  }

  await page.reload()
  await expect(page.getByRole("switch", { name: "Demo scope" })).toBeChecked()

  const health = await page.request.get("/api/health")
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toEqual({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
})

test("switches complete location snapshots and resets local demo changes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)
  await page.getByRole("switch", { name: "Demo scope" }).click()

  const locationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  const dashboardLocation = page.getByRole("region", { name: "Dashboard clinic location summary" })
  const dashboardMetrics = page.getByRole("region", { name: "Dashboard metrics" })

  await expect(locationSelector).toHaveAccessibleName(/Current location: Avenora Clinic — İstanbul/)
  await expect(dashboardMetrics.getByText("18,420")).toBeVisible()
  await expect(dashboardMetrics.getByText("82%")).toBeVisible()
  await page.getByRole("button", { name: "90 days" }).click()
  await page.locator('[data-funnel-stage="impressions"]').click()
  await expect(page.getByText("Impressions over time")).toBeVisible()

  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await expect(locationSelector).toHaveAccessibleName(/Current location: Avenora Clinic — İzmir/)
  await expect(dashboardLocation.getByText("Alsancak, İzmir")).toBeVisible()
  await expect(dashboardMetrics.getByText("35,920")).toBeVisible()
  await expect(dashboardMetrics.getByText("91%")).toBeVisible()
  await expect(page.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Impressions over time")).toBeVisible()

  await page.getByRole("button", { name: "Messages" }).click()
  await expect(page.getByRole("heading", { name: "Leyla Demir" })).toBeVisible()
  await expect(
    page
      .getByRole("region", { name: "Conversation between Leyla Demir and Dr Derya Aydın" })
      .getByText("Dr Derya Aydın"),
  ).toBeVisible()
  const localMessage = "Local İzmir message must not cross locations."
  await page.getByRole("textbox", { name: "Write a message" }).fill(localMessage)
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByText(localMessage)).toBeVisible()

  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — Antalya/ }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Ece Arslan" })).toBeVisible()
  await expect(
    page
      .getByRole("region", { name: "Conversation between Ece Arslan and Dr Zeynep Arslan" })
      .getByText("Dr Zeynep Arslan"),
  ).toBeVisible()
  await expect(page.getByText(localMessage)).toHaveCount(0)

  await page.getByRole("button", { name: "Reviews" }).click()
  await expect(page.getByText("Melis Güneş")).toBeVisible()
  await page.getByRole("button", { name: "Clinic profile" }).click()
  await expect(page.getByLabel("Clinic name")).toHaveValue("Avenora Clinic — Antalya")

  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  const clinicName = page.getByLabel("Clinic name")
  await expect(clinicName).toHaveValue("Avenora Clinic — İzmir")
  await clinicName.fill("Locally edited İzmir clinic")
  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — Antalya/ }).click()
  await expect(clinicName).toHaveValue("Avenora Clinic — Antalya")
  await locationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await expect(clinicName).toHaveValue("Avenora Clinic — İzmir")
  await expect(page.getByText("Locally edited İzmir clinic")).toHaveCount(0)

  await page.getByRole("button", { name: "Dashboard" }).click()
  await expect(page.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("Impressions over time")).toBeVisible()

  const reloadMessage = "Active local message must be cleared by reload."
  await page.getByRole("button", { name: "Messages" }).click()
  await page.getByRole("textbox", { name: "Write a message" }).fill(reloadMessage)
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByText(reloadMessage)).toBeVisible()
  await page.getByRole("button", { name: "Clinic profile" }).click()
  await page.getByLabel("Clinic name").fill("Active local clinic name before reload")
  await expect(page.getByLabel("Clinic name")).toHaveValue("Active local clinic name before reload")

  await page.reload()

  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toHaveAccessibleName(
    /Current location: Avenora Clinic — İstanbul/,
  )
  await expect(
    page.getByRole("region", { name: "Dashboard clinic location summary" }).getByText("Levent, İstanbul"),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "30 days" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "false")
  await expect(page.getByText("Profile views over time")).toBeVisible()
  await expect(page.getByText("Impressions over time")).toHaveCount(0)

  const reloadedLocationSelector = page.getByRole("button", { name: /Switch clinic location/ })
  await reloadedLocationSelector.click()
  await page.getByRole("menuitem", { name: /Avenora Clinic — İzmir/ }).click()
  await page.getByRole("button", { name: "Messages" }).click()
  await expect(page.getByText(localMessage)).toHaveCount(0)
  await expect(page.getByText(reloadMessage)).toHaveCount(0)
  await page.getByRole("button", { name: "Clinic profile" }).click()
  await expect(page.getByLabel("Clinic name")).toHaveValue("Avenora Clinic — İzmir")
  await expect(page.getByText("Active local clinic name before reload")).toHaveCount(0)
})

test("routes dashboard tasks into their owning workspace sections", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

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
  await page.getByRole("button", { name: "Review team" }).click()
  const teamDialog = page.getByRole("dialog", { name: "Open doctor profiles" })
  await expect(teamDialog).toBeVisible()
  await teamDialog.getByRole("button", { name: "Open doctors and team" }).click()
  await expect(page.locator("#clinic-profile-team")).toBeFocused()
})

test("opens the honest local support prototype from a missing treatment", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("switch", { name: "Demo scope" }).click()
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

  await expect(supportDialog.getByRole("status")).toHaveText("Demo only — no request was sent.")
})

test("opens the account menu and signs out", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { name: "Open account menu for Selin Erdem" }).click()
  const menu = page.getByRole("menu", { name: "Account menu" })
  await expect(menu.getByText("Selin Erdem")).toBeVisible()
  await expect(menu.getByText("Clinic administrator")).toBeVisible()
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

  await page.getByRole("button", { name: "Open account menu for Selin Erdem" }).click()
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
