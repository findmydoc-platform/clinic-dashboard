import { expect, test } from "@playwright/test"

test("requires the temporary guard before rendering the foundation", async ({ page }) => {
  const response = await page.goto("/")

  expect(response?.headers()["x-robots-tag"]).toContain("noindex")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()

  await page.getByLabel("Password").fill("findmydoc")
  await page.getByRole("button", { name: "Sign in" }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole("heading", { name: "Clinic Dashboard foundation" })).toBeVisible()
  await expect(page.getByText("No clinic modules connected")).toBeVisible()
  await expect(
    page.getByText(
      "This preview contains no clinic data and is protected by a temporary first-access guard.",
    ),
  ).toBeVisible()

  const health = await page.request.get("/api/health")
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toEqual({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
})
