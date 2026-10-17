import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  const mobileMenu = page.getByRole("button", { name: "Open navigation" })
  if (await mobileMenu.isVisible()) await mobileMenu.click()
  await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
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

test("doctor source access loss protects its actual draft until explicit discard", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.setViewportSize({ width: 375, height: 812 })
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.name))
  await signIn(page)
  await page.getByRole("button", { name: "Edit Amelia Carter" }).click()
  await page.getByRole("textbox", { name: "First name" }).fill("Unfinished restricted doctor")
  await page.route("**/api/dashboard/clinics/controlled-clinic/doctors/controlled-doctor-1", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "DOCTOR_ACCESS_DENIED" }),
    }),
  )
  await page.getByRole("button", { name: "Save doctor", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeFocused()
  await expect(page.getByRole("dialog", { name: "Edit doctor" })).toHaveCount(0)
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await expect(page.getByText("Unfinished restricted doctor")).toHaveCount(0)
  await page.screenshot({ path: "output/playwright/group-access/234/doctor-source-denial-protected-375.png" })
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const confirmation = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await expect(confirmation).toBeVisible()
  await expect(confirmation).toHaveCSS("opacity", "1")
  await page.screenshot({
    path: "output/playwright/group-access/234/doctor-recovery-confirmation-375.png",
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden }",
  })
  await confirmation.getByRole("button", { name: "Stay restricted" }).focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await confirmation.getByRole("button", { name: "Discard and open clinic" }).focus()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByText("Noah Bennett", { exact: true })).toBeVisible()
  await expect(page.getByText("Unfinished restricted doctor")).toHaveCount(0)
  expect(runtimeErrors).toEqual([])
})

test("combined profile and doctor drafts use reachable departure confirmations", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.name))
  await signIn(page)
  await page.getByRole("button", { name: /^(?:Edit profile|Continue editing)$/ }).click()
  const description = page.getByLabel("Description", { exact: true })
  await description.fill("Private profile draft beside a doctor draft.")
  await page.getByRole("button", { name: "Edit Amelia Carter" }).click()
  const doctor = page.getByRole("dialog", { name: "Edit doctor" })
  await doctor.getByLabel("First name", { exact: true }).fill("Private combined doctor")
  await switchClinic(page)
  await expect(doctor.getByText("Discard the unsaved changes?")).toBeVisible()
  await doctor.getByRole("button", { name: "Keep editing" }).click()
  await expect(doctor.getByLabel("First name", { exact: true })).toHaveValue("Private combined doctor")
  await expect(description).toHaveValue("Private profile draft beside a doctor draft.")
  await switchClinic(page)
  await page.route("**/api/dashboard/clinics/controlled-clinic/doctors/controlled-doctor-1", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "DOCTOR_SERVICE_UNAVAILABLE" }),
    }),
  )
  await doctor.getByRole("button", { name: "Save and continue" }).click()
  await expect(doctor.getByText(/could not be saved/)).toBeVisible()
  await expect(doctor.getByLabel("First name", { exact: true })).toHaveValue("Private combined doctor")
  await expect(description).toHaveValue("Private profile draft beside a doctor draft.")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.screenshot({
    path: "output/playwright/234-integration/both-drafts-save-failed-light.png",
    animations: "disabled",
  })
  await doctor.getByRole("button", { name: "Discard changes" }).click()
  const profile = page.getByRole("alertdialog", { name: "Leave profile editing?" })
  await expect(profile).toBeVisible()
  await expect(profile).toHaveCSS("opacity", "1")
  await page.screenshot({
    path: "output/playwright/234-integration/both-drafts-departure-light.png",
    animations: "disabled",
  })
  await profile.getByRole("button", { name: "Keep editing" }).click()
  await expect(description).toHaveValue("Private profile draft beside a doctor draft.")
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: "Second Controlled Clinic", exact: true }).click()
  await profile.getByRole("button", { name: "Leave without saving" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByText("Noah Bennett", { exact: true })).toBeVisible()
  const original = await (await page.request.get("/api/dashboard/clinics/controlled-clinic/profile")).json()
  expect(original.published.description).not.toBe("Private profile draft beside a doctor draft.")
  expect(errors).toEqual([])
})

test("combined profile and doctor access loss keeps both drafts private until explicit discard", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.setViewportSize({ width: 390, height: 844 })
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.name))
  await signIn(page)
  await page.getByRole("button", { name: /^(?:Edit profile|Continue editing)$/ }).click()
  await page.getByLabel("Description", { exact: true }).fill("Private combined recovery profile.")
  await page.getByRole("button", { name: "Edit Amelia Carter" }).click()
  await page.getByLabel("First name", { exact: true }).fill("Private combined recovery doctor")
  let deniedWrites = 0
  await page.route("**/api/dashboard/clinics/controlled-clinic/doctors/controlled-doctor-1", (route) => {
    deniedWrites += 1
    return route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "DOCTOR_ACCESS_DENIED" }),
    })
  })
  await page.getByRole("button", { name: "Save doctor", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeFocused()
  await expect(page.getByRole("dialog", { name: "Edit doctor" })).toHaveCount(0)
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await expect(page.getByText("Private combined recovery profile.", { exact: true })).toHaveCount(0)
  await expect(page.getByText("Private combined recovery doctor", { exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const confirmation = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await expect(confirmation).toHaveCSS("opacity", "1")
  await page.screenshot({
    path: "output/playwright/234-integration/both-drafts-recovery-light.png",
    animations: "disabled",
  })
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveClass(/dark/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({
    path: "output/playwright/234-integration/both-drafts-recovery-dark.png",
    animations: "disabled",
  })
  await confirmation.getByRole("button", { name: "Stay restricted" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await confirmation.getByRole("button", { name: "Discard and open clinic" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=profile$/)
  await expect(page.getByText("Noah Bennett", { exact: true })).toBeVisible()
  expect(deniedWrites).toBe(1)
  expect(errors).toEqual([])
})
