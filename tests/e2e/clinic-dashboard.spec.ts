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

  const interfaceModeSwitch = page.getByRole("switch", { name: "Full interface" })
  await expect(interfaceModeSwitch).not.toBeChecked()
  await interfaceModeSwitch.click()
  await expect(interfaceModeSwitch).toBeChecked()
  await expect(page.getByRole("group", { name: "Reporting period" })).toBeVisible()

  for (const section of ["Messages", "Reviews", "Clinic profile"] as const) {
    await page.getByRole("button", { exact: true, name: section }).click()
    await expect(page.getByRole("heading", { level: 1, name: section })).toBeVisible()
  }

  await page.reload()
  await expect(page.getByRole("switch", { name: "Full interface" })).toBeChecked()

  const health = await page.request.get("/api/health")
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toEqual({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
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

test("resets prototype location selection after a reload", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("switch", { name: "Full interface" }).click()
  const locationSelector = page.getByRole("combobox", { name: "Clinic location" })
  const dashboardLocation = page.getByRole("region", { name: "Dashboard clinic location summary" })

  await expect(locationSelector).toHaveValue("berlin-mitte")
  await locationSelector.selectOption("berlin-charlottenburg")
  await expect(
    page.getByRole("group", {
      name: "Current clinic identity: Berlin Health Clinic — Charlottenburg",
    }),
  ).toBeVisible()
  await expect(dashboardLocation.getByText("Charlottenburg, Berlin")).toBeVisible()

  await page.reload()

  await expect(page.getByRole("combobox", { name: "Clinic location" })).toHaveValue("berlin-mitte")
  await expect(
    page.getByRole("group", { name: "Current clinic identity: Berlin Health Clinic — Mitte" }),
  ).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Dashboard clinic location summary" }).getByText("Mitte, Berlin"),
  ).toBeVisible()
})

test("opens the account menu and signs out", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signIn(page)

  await page.getByRole("button", { name: "Open account menu for Sarah Schmidt" }).click()
  const menu = page.getByRole("menu", { name: "Account menu" })
  await expect(menu.getByText("Sarah Schmidt")).toBeVisible()
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

  await page.getByRole("button", { name: "Open account menu for Sarah Schmidt" }).click()
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
