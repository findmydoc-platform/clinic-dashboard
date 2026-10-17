import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await Promise.all([
    page.waitForURL(/\/clinics\/controlled-clinic\?section=dashboard$/),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ])
  const navigation = page.getByRole("button", { name: "Open navigation", exact: true })
  if (await navigation.isVisible()) await navigation.click()
  await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Treatments and prices", exact: true })).toBeVisible()
}
async function switchClinic(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name, exact: true }).click()
}
async function screenshot(page: Page, name: string) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    )
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `output/playwright/232/${name}.png`, fullPage: false })
}
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
})

test("edits, deactivates and assigns treatments in the original selected clinic through a guarded native modal switch", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await screenshot(page, "232-treatments-mobile-light")
  await page.getByRole("button", { name: "Edit Controlled treatment", exact: true }).click()
  const editor = page.getByRole("dialog", { name: "Edit treatment", exact: true })
  const price = editor.getByRole("spinbutton", { name: "Price (EUR)", exact: true })
  await page.setViewportSize({ width: 320, height: 568 })
  await expect(editor.getByRole("button", { name: "Save changes", exact: true })).toBeVisible()
  await screenshot(page, "232-treatment-320-short-light")
  await page.setViewportSize({ width: 390, height: 844 })
  await price.fill("310")
  await price.press("Tab")
  await screenshot(page, "232-treatment-keyboard-light")
  await editor.getByRole("combobox", { name: "Active clinic while editing treatments" }).focus()
  await editor
    .getByRole("combobox", { name: "Active clinic while editing treatments" })
    .selectOption("controlled-second-clinic")
  const leave = page.getByRole("alertdialog", { name: "Leave treatment editing?", exact: true })
  await expect(leave).toBeVisible()
  await screenshot(page, "232-treatment-departure-light")
  await leave.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(price).toHaveValue("310")
  await expect(editor.getByRole("combobox", { name: "Active clinic while editing treatments" })).toBeFocused()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await editor.getByRole("checkbox", { name: "Publicly active", exact: true }).uncheck()
  await editor
    .getByRole("combobox", { name: "Active clinic while editing treatments" })
    .selectOption("controlled-second-clinic")
  await page
    .getByRole("alertdialog", { name: "Leave treatment editing?" })
    .getByRole("button", { name: "Save and continue", exact: true })
    .click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  const storedOriginal = await (
    await page.request.get("/api/dashboard/clinics/controlled-clinic/clinic-treatments")
  ).json()
  expect(storedOriginal.offerings[0]).toMatchObject({ price: 310, active: false })
  await expect(
    page.getByRole("button", { name: "Edit Available controlled treatment", exact: true }),
  ).toBeVisible()
  await expect(page.getByText("€475.00", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "New treatment", exact: true }).click()
  const create = page.getByRole("dialog", { name: "Add treatment", exact: true })
  await create
    .getByRole("combobox", { name: "Treatment", exact: true })
    .selectOption("controlled-treatment-1")
  await create.getByRole("spinbutton", { name: "Price (EUR)", exact: true }).fill("600")
  await create.getByRole("button", { name: "Add treatment", exact: true }).click()
  await expect(create).toBeHidden()
  await switchClinic(page, "Controlled Clinic")
  await expect(page.getByText("€310.00", { exact: true })).toBeVisible()
  await expect(page.getByText("Inactive", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Open account menu/ }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Edit Controlled treatment", exact: true }).click()
  await screenshot(page, "232-treatment-editor-dark")
  await page
    .getByRole("dialog", { name: "Edit treatment" })
    .getByRole("spinbutton", { name: "Price (EUR)" })
    .fill("311")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("alertdialog", { name: "Leave treatment editing?" })).toBeVisible()
  await screenshot(page, "232-treatment-departure-dark")
  await page.getByRole("button", { name: "Discard and continue", exact: true }).click()
  await expect(page.getByRole("dialog", { name: "Edit treatment" })).toBeHidden()
  const a = await (
    await page.request.get("/api/dashboard/clinics/controlled-clinic/clinic-treatments")
  ).json()
  const b = await (
    await page.request.get("/api/dashboard/clinics/controlled-second-clinic/clinic-treatments")
  ).json()
  expect(a.offerings[0]).toMatchObject({ price: 310, active: false })
  expect(b.offerings).toHaveLength(2)
  expect(b.offerings.find((item: { price: number }) => item.price === 600)).toMatchObject({ active: false })
  expect((await page.request.get("/api/dashboard/clinics/foreign-clinic/clinic-treatments")).status()).toBe(
    403,
  )
  expect((await page.request.get("/api/dashboard/clinic-treatments")).status()).toBe(404)
  expect(errors).toEqual([])
})

test("retains failed treatment saves and captures the actual draft before source access-loss recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page)
  await page.getByRole("button", { name: "Edit Controlled treatment", exact: true }).click()
  const editor = page.getByRole("dialog", { name: "Edit treatment", exact: true })
  const price = editor.getByRole("spinbutton", { name: "Price (EUR)", exact: true })
  await price.fill("329")
  const endpoint = "**/api/dashboard/clinics/controlled-clinic/clinic-treatments?offeringId=*"
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "CLINIC_TREATMENT_SERVICE_UNAVAILABLE" }),
    }),
  )
  await editor
    .getByRole("combobox", { name: "Active clinic while editing treatments" })
    .selectOption("controlled-second-clinic")
  const leave = page.getByRole("alertdialog", { name: "Leave treatment editing?" })
  await leave.getByRole("button", { name: "Save and continue", exact: true }).click()
  await expect(leave.getByRole("alert")).toContainText("could not be saved")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await leave.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(price).toHaveValue("329")
  await page.unroute(endpoint)
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "CLINIC_TREATMENT_ACCESS_DENIED" }),
    }),
  )
  await editor.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await expect(editor).toHaveCount(0)
  await screenshot(page, "232-treatment-access-loss-light")
  await page.getByRole("button", { name: "Open Second Controlled Clinic", exact: true }).click()
  const discard = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await discard.getByRole("button", { name: "Stay restricted", exact: true }).click()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic", exact: true }).click()
  await page
    .getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
    .getByRole("button", { name: "Discard and open clinic", exact: true })
    .click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic/)
  await expect(page.getByText("€475.00", { exact: true })).toBeVisible()
  await expect(page.getByRole("dialog", { name: "Edit treatment" })).toHaveCount(0)
})
