import { mkdir } from "node:fs/promises"
import { expect, test, type Page, type TestInfo } from "@playwright/test"

const first = "controlled-clinic"
const second = "controlled-second-clinic"
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
)
async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic\?section=dashboard$/)
  const navigation = page.getByRole("button", { name: "Open navigation", exact: true })
  if (await navigation.isVisible()) await navigation.click()
  await page.getByRole("button", { name: "Clinic profile", exact: true }).click()
}
async function switchClinic(page: Page, name: string) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: new RegExp(`^${name}`) }).click()
}
async function openEditor(page: Page) {
  await page
    .getByRole("region", { name: "Clinic image gallery" })
    .getByRole("button", { name: "Manage gallery" })
    .click()
  return page.getByRole("region", { name: "Manage gallery" })
}
async function upload(page: Page, alt: string) {
  const editor = page.getByRole("region", { name: "Manage gallery" })
  await editor.getByRole("button", { name: "Add images" }).first().click()
  const dialog = page.getByRole("dialog", { name: "Add images" })
  await dialog
    .locator('input[type="file"]')
    .setInputFiles({ buffer: png, mimeType: "image/png", name: `${alt}.png` })
  await expect(dialog).toBeHidden()
  await editor.getByRole("textbox", { name: "Alt text" }).fill(alt)
}
async function capture(page: Page, info: TestInfo, state: string) {
  await page.evaluate(() => window.scrollTo(0, 0))
  for (const image of await page.locator("img").all()) {
    if (await image.isVisible()) {
      await expect(image).toHaveJSProperty("complete", true)
      await expect
        .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0)
    }
  }
  await mkdir("output/playwright/233", { recursive: true })
  await page.screenshot({
    animations: "disabled",
    path: `output/playwright/233/233-gallery-${state}.png`,
    fullPage: true,
  })
  await info.attach(state, {
    path: `output/playwright/233/233-gallery-${state}.png`,
    contentType: "image/png",
  })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

test("gallery preserves per-clinic curation and guards a cancelled or discarded switch", async ({
  page,
  context,
  baseURL,
}, info) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await openEditor(page)
  await upload(page, "Clinic A reception")
  const editor = page.getByRole("region", { name: "Manage gallery" })
  await capture(page, info, "mobile-light")
  await page.emulateMedia({ colorScheme: "dark" })
  await capture(page, info, "mobile-dark")
  await editor.getByRole("button", { name: "Save and return" }).click()
  await expect(editor).toBeHidden()
  const imageA = page
    .getByRole("region", { name: "Clinic image gallery" })
    .getByRole("img", { name: "Clinic A reception" })
  await expect(imageA).toBeVisible()
  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path: "output/playwright/233/233-gallery-stable-dark-viewport.png",
  })
  const imageUrl = await imageA.getAttribute("src")
  expect(imageUrl).toContain(`/clinics/${first}/gallery/image?token=`)
  await openEditor(page)
  await editor.getByRole("textbox", { name: "Alt text" }).fill("Unsaved A details")
  await editor.getByRole("button", { name: "Add images" }).first().click()
  const add = page.getByRole("dialog", { name: "Add images" })
  await expect(add).toBeVisible()
  await page.keyboard.press("Tab")
  expect(await add.evaluate((node) => node.contains(document.activeElement))).toBe(true)
  await capture(page, info, "keyboard-upload")
  await page.keyboard.press("Escape")
  await expect(add).toBeHidden()
  const previousUrl = page.url()
  await switchClinic(page, "Second Controlled Clinic")
  const leave = page.getByRole("alertdialog", { name: "Save changes before leaving?" })
  await expect(leave).toBeVisible()
  await expect(leave).toHaveCSS("opacity", "1")
  await capture(page, info, "departure-dark")
  await page.screenshot({
    animations: "disabled",
    fullPage: false,
    path: "output/playwright/233/233-gallery-departure-dark-viewport.png",
  })
  await leave.getByRole("button", { name: "Keep editing" }).click()
  await expect(page).toHaveURL(previousUrl)
  await expect(editor.getByRole("textbox", { name: "Alt text" })).toHaveValue("Unsaved A details")
  await switchClinic(page, "Second Controlled Clinic")
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click()
  await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=profile$`))
  await expect(page.getByText("No gallery images yet")).toBeVisible()
  expect(
    (await page.request.get(imageUrl!.replace(`/clinics/${first}/`, `/clinics/${second}/`))).status(),
  ).toBe(403)
  await openEditor(page)
  await upload(page, "Clinic B consultation")
  await editor.getByRole("button", { name: "Save and return" }).click()
  await expect(editor).toBeHidden()
  await capture(page, info, "second-clinic-dark")
  await switchClinic(page, "Controlled Clinic")
  await expect(page.getByRole("img", { name: "Clinic A reception" })).toBeVisible()
  await expect(page.getByRole("img", { name: "Clinic B consultation" })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole("img", { name: "Clinic A reception" })).toBeVisible()
  expect(errors).toEqual([])
})

test("a delayed upload cannot populate the next clinic after browser navigation", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await signIn(page)
  await openEditor(page)
  let received!: () => void
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    received = resolve
  })
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(`**/api/dashboard/clinics/${first}/gallery/media`, async (route) => {
    const response = await route.fetch()
    received()
    await held
    await route.fulfill({ response }).catch(() => undefined)
  })
  await page
    .getByRole("region", { name: "Manage gallery" })
    .getByRole("button", { name: "Add images" })
    .first()
    .click()
  await page
    .getByRole("dialog", { name: "Add images" })
    .locator('input[type="file"]')
    .setInputFiles({ buffer: png, mimeType: "image/png", name: "delayed.png" })
  await pending
  try {
    page.once("dialog", (dialog) => void dialog.accept())
    await page.goto(`/clinics/${second}?section=profile`)
  } finally {
    release()
  }
  await expect(page).toHaveURL(new RegExp(`/clinics/${second}\\?section=profile$`))
  await openEditor(page)
  await expect(
    page.getByRole("region", { name: "Manage gallery" }).getByRole("button", { name: /Edit image.*delayed/ }),
  ).toHaveCount(0)
})
