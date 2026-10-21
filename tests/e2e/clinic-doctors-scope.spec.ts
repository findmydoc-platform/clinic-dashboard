import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
  const mobileMenu = page.getByRole("button", { name: "Open navigation", exact: true })
  if (page.viewportSize()!.width < 768) {
    await expect(mobileMenu).toBeVisible()
    await mobileMenu.click()
    await expect(page.getByRole("dialog", { name: "Clinic navigation", exact: true })).toBeVisible()
  }
  const profile = page.getByRole("button", { name: "Clinic profile", exact: true })
  await expect(profile).toBeVisible()
  await profile.click()
}
async function switchClinic(page: Page) {
  const selector = page.getByRole("dialog", { name: "Edit doctor" }).getByLabel("Active clinic")
  await selector.selectOption("controlled-second-clinic")
}

test("doctor edits and protected switching stay bound to the selected clinic", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page)
  await page.getByRole("button", { name: "Edit Amelia Carter" }).click()
  const dialog = page.getByRole("dialog", { name: "Edit doctor" })
  await dialog.getByRole("textbox", { name: "Biography" }).fill("Changed in the first clinic only.")
  const saved = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        "/api/dashboard/clinics/controlled-clinic/doctors/controlled-doctor-1" &&
      response.request().method() === "PATCH",
  )
  await dialog.getByRole("button", { name: "Save doctor", exact: true }).click()
  expect((await saved).status()).toBe(200)
  await expect(dialog).not.toBeVisible()
  await page.getByRole("button", { name: "Edit Amelia Carter" }).click()
  await dialog.getByRole("textbox", { name: "First name" }).fill("Private unfinished doctor")
  await switchClinic(page)
  await expect(dialog.getByText("Discard the unsaved changes?")).toBeVisible()
  await page.screenshot({ path: "output/playwright/group-access/234/doctor-switch-confirmation-375.png" })
  await dialog.getByRole("button", { name: "Keep editing" }).focus()
  await page.keyboard.press("Enter")
  await expect(dialog.getByRole("textbox", { name: "First name" })).toHaveValue("Private unfinished doctor")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.route("**/api/dashboard/clinics/controlled-clinic/doctors/controlled-doctor-1", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "DOCTOR_SERVICE_UNAVAILABLE" }),
    }),
  )
  await switchClinic(page)
  await dialog.getByRole("button", { name: "Save and continue" }).click()
  await expect(dialog.getByText(/could not be saved/)).toBeVisible()
  await expect(dialog.getByRole("textbox", { name: "First name" })).toHaveValue("Private unfinished doctor")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.screenshot({ path: "output/playwright/group-access/234/doctor-save-failure-375.png" })
  await dialog.getByRole("button", { name: "Discard changes" }).focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByText("Noah Bennett", { exact: true })).toBeVisible()
  await expect(page.getByText("Amelia Carter", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Private unfinished doctor", { exact: true })).toHaveCount(0)
  for (const width of [320, 375, 640, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => {
      const elements = [...document.querySelectorAll("body *")]
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            tag: element.tagName.toLowerCase(),
            name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 40),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            scrollWidth: element.scrollWidth,
          }
        })
        .filter((element) => element.left < -1 || element.right > innerWidth + 1)
        .slice(0, 8)
      return { pageWidth: document.documentElement.scrollWidth, elements }
    })
    expect(
      overflow.pageWidth,
      `document overflows at ${width}px: ${JSON.stringify(overflow.elements)}`,
    ).toBeLessThanOrEqual(width)
    await page.screenshot({ path: `output/playwright/group-access/234/doctor-directory-${width}.png` })
  }
  await page.getByRole("button", { name: "Edit Noah Bennett" }).click()
  await page.setViewportSize({ width: 375, height: 450 })
  await expect(page.getByRole("button", { name: "Save doctor", exact: true })).toBeVisible()
  await page.screenshot({ path: "output/playwright/group-access/234/doctor-editor-short-height.png" })
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.screenshot({ path: "output/playwright/group-access/234/doctor-editor-dark-375.png" })
  await dialog
    .getByRole("textbox", { name: "Biography" })
    .fill("Saved in the second clinic before switching.")
  await dialog.getByLabel("Active clinic").selectOption("controlled-clinic")
  const savedBeforeSwitch = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        "/api/dashboard/clinics/controlled-second-clinic/doctors/controlled-second-clinic-controlled-doctor-1" &&
      response.request().method() === "PATCH",
  )
  await dialog.getByRole("button", { name: "Save and continue" }).focus()
  await page.keyboard.press("Enter")
  expect((await savedBeforeSwitch).status()).toBe(200)
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=profile$/)
  await expect(page.getByText("Noah Bennett", { exact: true })).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/group-access/234/doctor-save-and-switch-complete.png" })
  expect(runtimeErrors).toEqual([])
})

test("doctor BFF rejects a foreign clinic and mismatched doctor under another eligible clinic", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await signIn(page)
  const result = await page.evaluate(async () => {
    const csrf = document.cookie
      .split("; ")
      .find((value) => value.startsWith("clinic_dashboard_csrf="))
      ?.split("=")[1]
    const outcomes = []
    for (const clinic of ["foreign-clinic", "controlled-second-clinic"]) {
      const response = await fetch(`/api/dashboard/clinics/${clinic}/doctors/controlled-doctor-1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-csrf-token": decodeURIComponent(csrf ?? "") },
        body: JSON.stringify({ biography: "Rejected mismatch" }),
      })
      outcomes.push({ status: response.status, cache: response.headers.get("cache-control") })
    }
    return outcomes
  })
  expect(result).toEqual([
    { status: 403, cache: "private, no-store" },
    { status: 404, cache: "private, no-store" },
  ])
})
