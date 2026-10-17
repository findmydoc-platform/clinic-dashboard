import { expect, test, type Page } from "../fixtures/controlled-profile-scenario"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  const navigation = page.getByRole("button", { name: "Open navigation", exact: true })
  if (await navigation.isVisible()) await navigation.click()
  await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
}
async function switchClinic(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name, exact: true }).click()
}
async function stableScreenshot(page: Page, name: string) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    )
  })
  await page.screenshot({ path: `output/playwright/231/${name}.png`, fullPage: false })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
})

test("keeps profile drafts, opening hours and publication on the selected clinic", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await expect(page.getByText("Controlled Bosphorus Clinic", { exact: true })).toBeVisible()
  await stableScreenshot(page, "231-profile-mobile-light")
  await page.getByRole("button", { name: /Open account menu/ }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await page.keyboard.press("Escape")
  await expect(page.locator("html")).toHaveClass(/dark/)
  await stableScreenshot(page, "231-profile-mobile-dark")
  await page.getByRole("button", { name: "Edit profile", exact: true }).click()
  const name = page.getByRole("textbox", { name: "Clinic name" })
  await name.fill("Scoped Bosphorus Profile")
  await name.press("Tab")
  await stableScreenshot(page, "231-profile-keyboard-edit")
  await page
    .getByRole("heading", { name: "Address", exact: true })
    .locator("..")
    .getByRole("button", { name: "Edit", exact: true })
    .click()
  const address = page.getByRole("dialog", { name: "Edit address", exact: true })
  await address.getByLabel("Street", { exact: true }).fill("Scoped Address Avenue")
  await address.getByRole("combobox", { name: "City", exact: true }).fill("Ankara")
  await page.getByRole("option", { name: "Ankara", exact: true }).click()
  await stableScreenshot(page, "231-profile-address-dark")
  await address.getByRole("button", { name: "Apply address" }).click()
  await page
    .getByRole("heading", { name: "Opening hours", exact: true })
    .locator("..")
    .getByRole("button", { name: "Edit", exact: true })
    .click()
  const hours = page.getByRole("dialog", { name: "Edit opening hours", exact: true })
  await hours.getByLabel("Closes for Monday", { exact: true }).fill("17:30")
  await hours.getByRole("button", { name: "Apply hours" }).click()
  await switchClinic(page, "Second Controlled Clinic")
  const departure = page.getByRole("alertdialog", { name: "Leave profile editing?" })
  await expect(departure).toBeVisible()
  await stableScreenshot(page, "231-profile-departure-dark")
  await departure.getByRole("button", { name: "Keep editing" }).click()
  await expect(name).toHaveValue("Scoped Bosphorus Profile")
  await switchClinic(page, "Second Controlled Clinic")
  await page
    .getByRole("alertdialog", { name: "Leave profile editing?" })
    .getByRole("button", { name: "Save draft and leave" })
    .click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByText("Controlled Ankara Clinic", { exact: true })).toBeVisible()
  await expect(page.getByText("Scoped Bosphorus Profile", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Continue editing" })).toHaveCount(0)
  await switchClinic(page, "Controlled Clinic")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=profile$/)
  await page.getByRole("button", { name: "Review & publish" }).click()
  const review = page.getByRole("dialog", { name: "Review and publish" })
  await expect(review.getByText("Added: Scoped Address Avenue", { exact: true })).toBeVisible()
  await stableScreenshot(page, "231-profile-review-dark")
  await review.getByRole("button", { name: "Publish changes" }).click()
  await expect(page.getByText("Scoped Bosphorus Profile", { exact: true })).toBeVisible()
  expect((await page.request.get("/api/dashboard/profile")).status()).toBe(403)
  expect((await page.request.get("/api/dashboard/clinics/foreign-clinic/profile")).status()).toBe(403)
  const original = await (await page.request.get("/api/dashboard/clinics/controlled-clinic/profile")).json()
  const second = await (
    await page.request.get("/api/dashboard/clinics/controlled-second-clinic/profile")
  ).json()
  expect(original.published.name).toBe("Scoped Bosphorus Profile")
  expect(second.published.name).toBe("Controlled Ankara Clinic")
  expect(second.draft).toBeUndefined()
  expect(errors).toEqual([])
})

test("keeps failed-save departure blocked and captures the real draft before source403 recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page)
  await switchClinic(page, "Second Controlled Clinic")
  await expect(page).toHaveURL(/controlled-second-clinic/)
  await switchClinic(page, "Controlled Clinic")
  await expect(page).toHaveURL(/controlled-clinic/)
  await page.getByRole("button", { name: /^(?:Edit profile|Continue editing)$/ }).click()
  const description = page.getByRole("textbox", { name: "Description", exact: true })
  await description.fill("Private old clinic draft retained for recovery.")
  const endpoint = "**/api/dashboard/clinics/controlled-clinic/profile/draft"
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" }),
    }),
  )
  await switchClinic(page, "Second Controlled Clinic")
  const leave = page.getByRole("alertdialog", { name: "Leave profile editing?" })
  await leave.getByRole("button", { name: "Save draft and leave" }).click()
  await expect(leave).toBeVisible()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await leave.getByRole("button", { name: "Keep editing" }).click()
  await expect(description).toHaveValue("Private old clinic draft retained for recovery.")
  await page.unroute(endpoint)
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "CLINIC_PROFILE_ACCESS_DENIED" }),
    }),
  )
  await page.getByRole("button", { name: "Save draft", exact: true }).first().click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await expect(description).toHaveCount(0)
  await page.evaluate(() => {
    document.documentElement.dataset.profileRecoveryProbe = "same-browser-session"
  })
  await page.goBack()
  await expect(page).toHaveURL(/controlled-second-clinic/)
  expect(await page.evaluate(() => document.documentElement.dataset.profileRecoveryProbe)).toBe(
    "same-browser-session",
  )
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const discard = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await discard.getByRole("button", { name: "Stay restricted" }).click()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await page
    .getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
    .getByRole("button", { name: "Discard and open clinic" })
    .click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
  await expect(page.getByText("Controlled Ankara Clinic", { exact: true })).toBeVisible()
  await expect(
    page.getByText("Private old clinic draft retained for recovery.", { exact: true }),
  ).toHaveCount(0)
})
