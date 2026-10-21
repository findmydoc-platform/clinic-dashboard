import { mkdir } from "node:fs/promises"
import type { TestInfo } from "@playwright/test"
import { expect, test, type Page } from "../fixtures/controlled-profile-scenario"

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

test("profile and gallery drafts survive restricted Back until original gallery cleanup runs once", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await signIn(page)
  await switchClinic(page, "Second Controlled Clinic")
  await expect(page).toHaveURL(/controlled-second-clinic/)
  await switchClinic(page, "Controlled Clinic")
  await expect(page).toHaveURL(/controlled-clinic/)
  await page.getByRole("button", { name: "Edit profile", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Private profile beside gallery work.")
  await page.getByRole("button", { name: "Dashboard", exact: true }).click()
  await page.getByRole("button", { name: /for Add clinic images$/ }).click()
  await page
    .getByRole("dialog", { name: "Add clinic images", exact: true })
    .getByRole("button", { name: "Edit clinic images", exact: true })
    .click()
  await expect(page.getByRole("region", { name: "Manage gallery" })).toBeVisible()
  await upload(page, "Private original gallery draft")
  const drafts = await (await page.request.get(`/api/dashboard/clinics/${first}/gallery`)).json()
  const draftId = drafts.items.find((item: { status: string }) => item.status === "draft").id
  const cleanups: unknown[] = []
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === `/api/dashboard/clinics/${first}/gallery/discard`
    )
      cleanups.push(request.postDataJSON())
  })
  await page.route(`**/api/dashboard/clinics/${first}/gallery`, (route) => {
    if (route.request().method() === "PUT")
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        json: { code: "CLINIC_GALLERY_ACCESS_DENIED" },
      })
    return route.continue()
  })
  await page
    .getByRole("region", { name: "Manage gallery" })
    .getByRole("button", { name: "Save and return" })
    .click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.dataset.galleryRecoveryProbe = "same-document"
  })
  await page.goBack()
  await expect(page).toHaveURL(/controlled-second-clinic/)
  expect(await page.evaluate(() => document.documentElement.dataset.galleryRecoveryProbe)).toBe(
    "same-document",
  )
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  expect(cleanups).toEqual([])
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const discard = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await discard.getByRole("button", { name: "Stay restricted" }).click()
  expect(cleanups).toEqual([])
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await discard.getByRole("button", { name: "Discard and open clinic" }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toHaveCount(0)
  expect(cleanups).toEqual([{ mediaIds: [draftId] }])
  await openEditor(page)
  await expect(
    page.getByRole("region", { name: "Manage gallery" }).getByRole("textbox", { name: "Alt text" }),
  ).toHaveCount(0)
  expect(errors).toEqual([])
})

for (const target of [
  { section: "reviews", key: "review", id: `${second}-seed-review-01`, heading: "Review details" },
  {
    section: "messages",
    key: "inquiry",
    id: "second-inquiry-lukas-weber",
    heading: "Second clinic Lukas Weber",
  },
]) {
  test(`dirty gallery save failure and profile decisions precede exact ${target.key} navigation`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
    await signIn(page)
    await page.getByRole("button", { name: "Edit profile", exact: true }).click()
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Original private profile beside gallery.")
    await page.getByRole("button", { name: "Dashboard", exact: true }).click()
    await page.getByRole("button", { name: /for Add clinic images$/ }).click()
    await page
      .getByRole("dialog", { name: "Add clinic images", exact: true })
      .getByRole("button", { name: "Edit clinic images", exact: true })
      .click()
    await upload(page, "Original dirty gallery metadata")
    let saves = 0
    let receipts = 0
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/api/notifications/read")
        receipts++
    })
    await page.route(`**/api/dashboard/clinics/${first}/gallery`, (route) => {
      if (route.request().method() === "PUT") {
        saves++
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          json: { code: "CLINIC_GALLERY_UNAVAILABLE" },
        })
      }
      return route.continue()
    })
    await page.locator("[data-clinic-workspace]").evaluate((root, path) => {
      const link = document.createElement("a")
      link.href = path
      link.textContent = "Open exact record from gallery"
      link.style.display = "block"
      link.style.minHeight = "44px"
      link.style.marginBlock = "10rem"
      root.querySelector("main")!.append(link)
    }, `/clinics/${second}?section=${target.section}&${target.key}=${target.id}`)
    const link = page.getByRole("link", { name: "Open exact record from gallery" })
    await link.click()
    const galleryLeave = page.getByRole("alertdialog", { name: "Save changes before leaving?" })
    await galleryLeave.getByRole("button", { name: "Keep editing" }).click()
    await expect(
      page.getByRole("region", { name: "Manage gallery" }).getByRole("textbox", { name: "Alt text" }),
    ).toHaveValue("Original dirty gallery metadata")
    expect(receipts).toBe(0)
    await link.click()
    await galleryLeave.getByRole("button", { name: "Save and return", exact: true }).click()
    await expect(page.getByText("The gallery is temporarily unavailable.", { exact: true })).toBeVisible()
    await expect(galleryLeave).toBeHidden()
    expect(saves).toBe(1)
    await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
    await expect(
      page.getByRole("region", { name: "Manage gallery" }).getByRole("textbox", { name: "Alt text" }),
    ).toHaveValue("Original dirty gallery metadata")
    await link.click()
    await galleryLeave.getByRole("button", { name: "Discard changes" }).click()
    const profileLeave = page.getByRole("alertdialog", { name: "Leave profile editing?" })
    await profileLeave.getByRole("button", { name: "Keep editing" }).click()
    await expect(page.getByRole("textbox", { name: "Description", exact: true })).toHaveValue(
      "Original private profile beside gallery.",
    )
    expect(receipts).toBe(0)
    await link.click()
    await profileLeave.getByRole("button", { name: "Leave without saving" }).click()
    await expect(page.getByRole("heading", { name: target.heading, exact: true })).toBeFocused()
    await expect(page).toHaveURL(
      new RegExp(`/clinics/${second}\\?section=${target.section}&${target.key}=${target.id}$`),
    )
    expect(saves).toBe(1)
    expect(receipts).toBe(0)
  })
}

for (const theme of ["light", "dark"] as const) {
  test(`gallery and upload dialog fit the complete viewport matrix in ${theme}`, async ({
    page,
    context,
    baseURL,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
    await page.emulateMedia({ colorScheme: theme })
    await signIn(page)
    await openEditor(page)
    await upload(page, "Synthetic clinic entrance for responsive gallery proof")
    await expect(page.getByText("1 image uploaded.", { exact: true })).toBeHidden()
    await mkdir("output/playwright/gallery-final", { recursive: true })
    for (const width of [320, 375, 640, 768, 1024, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      await page.evaluate(() => window.scrollTo(0, 0))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await expect(page.getByRole("button", { name: /Switch clinic location/ })).toBeVisible()
      const title = page.getByRole("heading", { name: "Manage gallery", exact: true })
      await expect(title).toBeVisible()
      expect(await title.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
      const header = page.getByRole("region", { name: "Manage gallery" }).locator("header")
      const countBox = await header.getByText("1 of 12 images", { exact: true }).boundingBox()
      const actionBox = await header.getByRole("button", { name: "Add images", exact: true }).boundingBox()
      expect(countBox).not.toBeNull()
      expect(actionBox).not.toBeNull()
      expect(
        countBox!.x + countBox!.width <= actionBox!.x || countBox!.y + countBox!.height <= actionBox!.y,
      ).toBe(true)
      await expect(
        page.getByRole("region", { name: "Manage gallery" }).getByRole("textbox", { name: "Alt text" }),
      ).toHaveValue("Synthetic clinic entrance for responsive gallery proof")
      await page.screenshot({
        animations: "disabled",
        path: `output/playwright/gallery-final/gallery-${width}-${theme}.png`,
      })
    }
    await page.setViewportSize({ width: 375, height: 540 })
    await page
      .getByRole("region", { name: "Manage gallery" })
      .getByRole("button", { name: "Add images" })
      .first()
      .click()
    const add = page.getByRole("dialog", { name: "Add images" })
    await expect(add).toBeVisible()
    await page.keyboard.press("Tab")
    expect(await add.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({
      animations: "disabled",
      path: `output/playwright/gallery-final/upload-short-${theme}.png`,
    })
    await page.keyboard.press("Escape")
    await expect(add).toBeHidden()
    const selector = page.getByRole("button", { name: /Switch clinic location/ })
    await selector.focus()
    await page.keyboard.press("Enter")
    await expect(page.getByRole("menuitem", { name: "Controlled Clinic", exact: true })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(selector).toBeFocused()
    expect(errors).toEqual([])
  })
}

test("a pending gallery File stays privately restricted and its real fallback preview is released", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
  await page.addInitScript(() => {
    Object.defineProperty(window, "createImageBitmap", { configurable: true, value: undefined })
    const create = URL.createObjectURL.bind(URL)
    const revoke = URL.revokeObjectURL.bind(URL)
    const active = new Set<string>()
    const proof = { created: 0, revoked: 0, active }
    ;(window as typeof window & { galleryPreviewProof: typeof proof }).galleryPreviewProof = proof
    URL.createObjectURL = (blob) => {
      const url = create(blob)
      proof.created++
      active.add(url)
      return url
    }
    URL.revokeObjectURL = (url) => {
      proof.revoked++
      active.delete(url)
      revoke(url)
    }
  })
  await signIn(page)
  await openEditor(page)
  let uploads = 0
  await page.route(`**/api/dashboard/clinics/${first}/gallery/media`, (route) => {
    uploads++
    return route.fulfill({
      status: 403,
      contentType: "application/json",
      json: { code: "CLINIC_GALLERY_ACCESS_DENIED" },
    })
  })
  await page
    .getByRole("region", { name: "Manage gallery" })
    .getByRole("button", { name: "Add images" })
    .first()
    .click()
  await page
    .getByRole("dialog", { name: "Add images" })
    .locator('input[type="file"]')
    .setInputFiles({ buffer: png, mimeType: "image/png", name: "pending-private.png" })
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  const preview = await page.evaluate(() => {
    const proof = (
      window as typeof window & {
        galleryPreviewProof: { created: number; revoked: number; active: Set<string> }
      }
    ).galleryPreviewProof
    return { created: proof.created, revoked: proof.revoked, active: proof.active.size }
  })
  expect(preview.created).toBeGreaterThan(0)
  expect(preview.revoked).toBe(preview.created)
  expect(preview.active).toBe(0)
  await expect(page.getByText("pending-private.png")).toHaveCount(0)
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  const discard = page.getByRole("alertdialog", { name: "Discard unfinished clinic work?" })
  await discard.getByRole("button", { name: "Stay restricted" }).click()
  await expect(
    page.getByText("Your unfinished work is protected privately until you explicitly discard it."),
  ).toBeVisible()
  await page.getByRole("button", { name: "Open Second Controlled Clinic" }).click()
  await discard.getByRole("button", { name: "Discard and open clinic" }).click()
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toHaveCount(0)
  await openEditor(page)
  await expect(
    page.getByRole("region", { name: "Manage gallery" }).getByRole("textbox", { name: "Alt text" }),
  ).toHaveCount(0)
  expect(uploads).toBe(1)
})
