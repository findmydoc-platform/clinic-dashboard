import { expect, test, type Page } from "@playwright/test"
async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill("clinic-staff@example.com")
  await page.getByLabel("Password").fill("clinic-dashboard-test")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-clinic/)
  await page.goto("/clinics/controlled-clinic?section=reviews")
}
async function switchClinic(page: Page) {
  await page.getByRole("button", { name: /Switch clinic location/ }).click()
  await page.getByRole("menuitem", { name: "Second Controlled Clinic", exact: true }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=reviews$/)
}
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "clinic_dashboard_controlled_clinics", value: "many", url: baseURL! }])
})
test("current clinic review list and exact history stay isolated across same-section switching", async ({
  page,
}) => {
  await signIn(page)
  await expect(page.getByText("Maya K.", { exact: true })).toBeVisible()
  const first = await page.request.get("/api/dashboard/clinics/controlled-clinic/reviews/seed-review-01")
  expect(first.status()).toBe(200)
  const foreign = await page.request.get("/api/dashboard/clinics/foreign-clinic/reviews/seed-review-01")
  expect(foreign.status()).toBe(403)
  expect(foreign.headers()["cache-control"]).toContain("private, no-store")
  expect((await page.request.get("/api/dashboard/reviews")).status()).toBe(403)
  await switchClinic(page)
  await expect(page.getByText("Synthetic controlled-second-clinic", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Maya K.", { exact: true })).toHaveCount(0)
  expect(
    (
      await page.request.get("/api/dashboard/clinics/controlled-second-clinic/reviews/seed-review-01")
    ).status(),
  ).toBe(404)
  const history = await page.request.get(
    "/api/dashboard/clinics/controlled-second-clinic/reviews/controlled-second-clinic-seed-review-01/history",
  )
  expect(history.status(), await history.text()).toBe(200)
  expect((await history.json()).reviewId).toBe("controlled-second-clinic-seed-review-01")
})
test("response draft guard preserves text and accepted response and appeal carry the current clinic target", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await page.getByRole("button", { name: "Edit pending response", exact: true }).first().click()
  const input = page.getByRole("textbox", { name: "Clinic response" })
  await input.fill("Synthetic clinic-specific response draft.")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("alertdialog", { name: "Leave review editing?" })).toBeVisible()
  await page.screenshot({ path: "output/playwright/236/review-draft-confirmation-mobile.png" })
  await page.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(input).toHaveValue("Synthetic clinic-specific response draft.")
  await expect(input).toBeFocused()
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/dashboard/clinics/controlled-clinic/reviews/") &&
      r.url().endsWith("/response") &&
      r.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Submit for moderation", exact: true }).click()
  expect((await response).status()).toBe(200)
  await switchClinic(page)
  await page.getByRole("button", { name: "Submit appeal", exact: true }).first().click()
  await page.getByRole("combobox", { name: "Reason" }).selectOption("other")
  await page
    .getByRole("textbox", { name: "Appeal details" })
    .fill("Synthetic appeal for the second clinic only.")
  const appeal = page.waitForResponse(
    (r) =>
      r.url().includes("/api/dashboard/clinics/controlled-second-clinic/reviews/") &&
      r.url().endsWith("/appeal") &&
      r.request().method() === "POST",
  )
  await page.getByRole("button", { name: "Submit appeal", exact: true }).last().click()
  expect((await appeal).status()).toBe(200)
})
test("mobile review list retains clinic identity, fits both themes, and logs no runtime errors", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await expect(page.getByRole("heading", { name: "Reviews", exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "output/playwright/236/reviews-mobile-light.png" })
  await page.getByRole("button", { name: "Open account menu for Alex Morgan" }).click()
  await page.getByRole("menuitemcheckbox", { name: "Dark mode" }).click()
  await page.keyboard.press("Escape")
  await switchClinic(page)
  await expect(page.getByText("Synthetic controlled-second-clinic", { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: "output/playwright/236/reviews-mobile-dark.png" })
  expect(errors).toEqual([])
})

test("late old-clinic list completion cannot restore data and current access loss clears reviews", async ({
  page,
}) => {
  await signIn(page)
  const old = await (await page.request.get("/api/dashboard/clinics/controlled-clinic/reviews")).json()
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false
  let completed = false
  await page.route("**/api/dashboard/clinics/controlled-clinic/reviews?**", async (route) => {
    requested = true
    await held
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...old,
          page: {
            ...old.page,
            items: old.page.items.map((item: Record<string, unknown>) => ({
              ...item,
              author: "Obsolete old clinic author",
            })),
          },
        }),
      })
    } catch {
      /* The old clinic may already have cancelled the request. */
    }
    completed = true
  })
  await page.getByRole("button", { name: "Refresh", exact: true }).click()
  await expect.poll(() => requested).toBe(true)
  await switchClinic(page)
  await expect(page.getByText("Synthetic controlled-second-clinic", { exact: true }).first()).toBeVisible()
  release()
  await expect.poll(() => completed).toBe(true)
  await expect(page.getByText("Obsolete old clinic author", { exact: true })).toHaveCount(0)
  await page.route("**/api/dashboard/clinics/controlled-second-clinic/reviews?**", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "REVIEW_ACCESS_DENIED" }),
    }),
  )
  await page.getByRole("button", { name: "Refresh", exact: true }).click()
  await expect(page).toHaveURL(/\/clinics\/controlled-second-clinic\?section=reviews$/)
  await expect(page.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
  await expect(page.getByText("Synthetic controlled-second-clinic", { exact: true })).toHaveCount(0)
})
