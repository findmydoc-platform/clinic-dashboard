import { randomUUID } from "node:crypto"
import { test as base } from "@playwright/test"

export { expect, type Page, type Route } from "@playwright/test"

export const test = base.extend<{ controlledProfileScenario: void }>({
  controlledProfileScenario: [
    async ({ context, baseURL }, use) => {
      if (!baseURL) throw new Error("A controlled browser origin is required")
      await context.addCookies([
        {
          name: "clinic_dashboard_controlled_profile_scenario",
          value: randomUUID(),
          url: baseURL,
        },
      ])
      await use()
    },
    { auto: true },
  ],
})
