import { mkdir } from "node:fs/promises"
import { expect, test, type Page } from "../fixtures/controlled-profile-scenario"

const first = "controlled-clinic"
const second = "controlled-second-clinic"
const pathFor = (id: string, section = "messages") => `/clinics/${id}?section=${section}`
async function signIn(page: Page, section = "messages") {
  await page.goto(`/login?next=${encodeURIComponent(pathFor(first, section))}`)
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/clinics/${first}\\?section=${section}$`))
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
}
async function switchClinic(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name, exact: true }).click()
  const id = name === "Second Controlled Clinic" ? second : first
  await expect(page).toHaveURL(new RegExp(`/clinics/${id}\\?`))
  await expect(page.getByRole("button", { name: /Switch clinic location/ })).toHaveAccessibleName(
    new RegExp(`Current location: ${name}`),
  )
  await expect(page.locator("[data-clinic-workspace]")).toHaveAttribute("aria-busy", "false")
}
async function stateDigest(page: Page) {
  return page.evaluate(async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(history.state))
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")
  })
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
})

for (const navigationApi of [true, false]) {
  test(`native Back and dirty Forward protect actual unsent replies with Navigation API ${navigationApi ? "present" : "absent"}`, async ({
    page,
  }) => {
    if (!navigationApi)
      await page.addInitScript(() =>
        Object.defineProperty(window, "navigation", { configurable: true, value: undefined }),
      )
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.name))
    let writes = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/inquiries/messages"))
        writes++
    })
    await signIn(page)
    await switchClinic(page, "Second Controlled Clinic")
    await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=messages$`))
    await page.getByRole("button", { name: /Second clinic Lukas Weber/ }).click()
    const reply = page.getByRole("textbox", { name: "Reply to patient" })
    await reply.fill("Actual unsent second-clinic history draft.")
    const length = await page.evaluate(() => history.length)
    const originalState = await stateDigest(page)
    await page.evaluate(() => {
      document.documentElement.dataset.historyProof = "same-document"
    })
    await page.goBack()
    const confirmation = page.getByRole("alertdialog", { name: "Leave unfinished inquiries?" })
    await expect(confirmation).toBeVisible()
    await expect(confirmation.getByRole("button", { name: "Keep editing", exact: true })).toBeFocused()
    if (navigationApi) {
      await mkdir("output/playwright/history-protection", { recursive: true })
      for (const theme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: theme })
        for (const width of [320, 375, 640, 768, 1024, 1280]) {
          await page.setViewportSize({ width, height: 844 })
          await expect(confirmation).toHaveCSS("opacity", "1")
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
          await expect(
            confirmation.getByRole("button", { name: "Keep editing", exact: true }),
          ).toBeInViewport()
          await expect(
            confirmation.getByRole("button", { name: "Discard and continue", exact: true }),
          ).toBeInViewport()
          await page.screenshot({
            path: `output/playwright/history-protection/inquiry-history-${width}-${theme}.png`,
            animations: "disabled",
            style: "nextjs-portal { visibility: hidden }",
          })
        }
        await page.setViewportSize({ width: 375, height: 540 })
        await page.screenshot({
          path: `output/playwright/history-protection/inquiry-history-short-${theme}.png`,
          animations: "disabled",
          style: "nextjs-portal { visibility: hidden }",
        })
      }
      await page.setViewportSize({ width: 1280, height: 900 })
    }
    await confirmation.getByRole("button", { name: "Keep editing", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=messages$`))
    await expect(reply).toHaveValue("Actual unsent second-clinic history draft.")
    await expect(reply).toBeFocused()
    expect(await stateDigest(page)).toBe(originalState)
    expect(await page.evaluate(() => history.length)).toBe(length)
    await page.goBack()
    await confirmation.getByRole("button", { name: "Discard and continue", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/clinics/${first}\\?section=messages$`))
    await page.getByRole("button", { name: /Lukas Weber/ }).click()
    await expect(reply).toHaveValue("")
    await reply.fill("Actual unsent first-clinic Forward draft.")
    await page.goForward()
    await expect(confirmation).toBeVisible()
    await confirmation.getByRole("button", { name: "Keep editing", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/clinics/${first}\\?section=messages$`))
    await expect(reply).toHaveValue("Actual unsent first-clinic Forward draft.")
    await page.goForward()
    await confirmation.getByRole("button", { name: "Discard and continue", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=messages$`))
    await page.getByRole("button", { name: /Second clinic Lukas Weber/ }).click()
    await expect(reply).toHaveValue("")
    expect(await page.evaluate(() => history.length)).toBe(length)
    expect(await page.evaluate(() => document.documentElement.dataset.historyProof)).toBe("same-document")
    expect(writes).toBe(0)
    expect(errors).toEqual([])
  })
}

test("history departure sequences the treatment child before a failed original-clinic profile save", async ({
  page,
}) => {
  await signIn(page, "profile")
  await switchClinic(page, "Second Controlled Clinic")
  await page.getByRole("button", { name: "Edit profile", exact: true }).click()
  const description = page.getByRole("textbox", { name: "Description", exact: true })
  await description.fill("Original second-clinic profile before native Back.")
  await page.getByRole("button", { name: "Edit Available controlled treatment", exact: true }).click()
  const treatment = page.getByRole("dialog", { name: "Edit treatment", exact: true })
  await treatment.getByRole("spinbutton", { name: "Price (EUR)", exact: true }).fill("777")
  await page.goBack()
  const treatmentLeave = page.getByRole("alertdialog", { name: "Leave treatment editing?", exact: true })
  await expect(treatmentLeave).toBeVisible()
  await expect(page.getByRole("alertdialog", { name: "Leave profile editing?", exact: true })).toHaveCount(0)
  await treatmentLeave.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(treatment.getByRole("spinbutton", { name: "Price (EUR)", exact: true })).toHaveValue("777")
  await page.goBack()
  await treatmentLeave.getByRole("button", { name: "Discard and continue", exact: true }).click()
  const profileLeave = page.getByRole("alertdialog", { name: "Leave profile editing?", exact: true })
  await expect(profileLeave).toBeVisible()
  await expect(treatment).toHaveCount(0)
  const savedClinics: { clinic: string; method: string }[] = []
  page.on("request", (request) => {
    const match = /^\/api\/dashboard\/clinics\/([^/]+)\/profile\/draft$/.exec(new URL(request.url()).pathname)
    if (match && request.method() !== "GET")
      savedClinics.push({ clinic: match[1]!, method: request.method() })
  })
  const endpoint = `**/api/dashboard/clinics/${second}/profile/draft`
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      json: { code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" },
    }),
  )
  await profileLeave.getByRole("button", { name: "Save draft and leave", exact: true }).click()
  await expect(profileLeave).toBeVisible()
  await expect(profileLeave.getByRole("button", { name: "Save draft and leave", exact: true })).toBeEnabled()
  expect(savedClinics).toEqual([{ clinic: second, method: "POST" }])
  await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=profile$`))
  await profileLeave.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(description).toHaveValue("Original second-clinic profile before native Back.")
  await page.unroute(endpoint)
  await page.goBack()
  await profileLeave.getByRole("button", { name: "Save draft and leave", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/clinics/${first}\\?section=profile$`))
  expect(savedClinics).toEqual([
    { clinic: second, method: "POST" },
    { clinic: second, method: "POST" },
    { clinic: second, method: "PUT" },
  ])
  const original = await (await page.request.get(`/api/dashboard/clinics/${second}/profile`)).json()
  const destination = await (await page.request.get(`/api/dashboard/clinics/${first}/profile`)).json()
  expect(original.draft.descriptionText).toBe("Original second-clinic profile before native Back.")
  expect(destination.draft).toBeUndefined()
  const offerings = await (
    await page.request.get(`/api/dashboard/clinics/${second}/clinic-treatments`)
  ).json()
  expect(offerings.offerings[0].price).not.toBe(777)
})

test("rapid native Back requests without Navigation API preserve the actual current reply and entry", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "navigation", { configurable: true, value: undefined }),
  )
  await signIn(page)
  const initialState = await stateDigest(page)
  await switchClinic(page, "Second Controlled Clinic")
  await switchClinic(page, "Controlled Clinic")
  await page.getByRole("button", { name: /Lukas Weber/ }).click()
  const reply = page.getByRole("textbox", { name: "Reply to patient" })
  await reply.fill("Actual reply during rapid native Back.")
  const originalState = await stateDigest(page)
  const length = await page.evaluate(() => history.length)
  await page.evaluate(() => {
    history.back()
    history.back()
  })
  const confirmation = page.getByRole("alertdialog", { name: "Leave unfinished inquiries?" })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(reply).toHaveValue("Actual reply during rapid native Back.")
  expect(await stateDigest(page)).toBe(originalState)
  expect(await page.evaluate(() => history.length)).toBe(length)
  await page.evaluate(() => {
    history.back()
    history.back()
  })
  await confirmation.getByRole("button", { name: "Discard and continue", exact: true }).click()
  await expect.poll(() => stateDigest(page)).toBe(initialState)
  const cleanReply = page.getByRole("textbox", { name: "Reply to patient" })
  await expect(cleanReply).toHaveValue("")
  await cleanReply.fill("Actual reply during rapid native Forward.")
  await page.evaluate(() => {
    history.forward()
    history.forward()
  })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(cleanReply).toHaveValue("Actual reply during rapid native Forward.")
  expect(await stateDigest(page)).toBe(initialState)
  await page.evaluate(() => {
    history.forward()
    history.forward()
  })
  await confirmation.getByRole("button", { name: "Discard and continue", exact: true }).click()
  await expect.poll(() => stateDigest(page)).toBe(originalState)
  await expect(page.getByRole("textbox", { name: "Reply to patient" })).toHaveValue("")
  expect(await page.evaluate(() => history.length)).toBe(length)
})
