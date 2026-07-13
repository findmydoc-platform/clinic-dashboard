import { expect, test } from "@playwright/test"

test("renders the public foundation without clinic data", async ({ page }) => {
  const response = await page.goto("/")

  expect(response?.headers()["x-robots-tag"]).toContain("noindex")
  await expect(page.getByRole("heading", { name: "Clinic Dashboard foundation" })).toBeVisible()
  await expect(page.getByText("No clinic modules connected")).toBeVisible()
  await expect(
    page.getByText("This preview contains no clinic data and does not provide sign-in yet."),
  ).toBeVisible()

  const health = await page.request.get("/api/health")
  expect(health.ok()).toBe(true)
  await expect(health.json()).resolves.toEqual({
    readiness: "foundation",
    service: "clinic-dashboard",
    status: "ok",
  })
})
