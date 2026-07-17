import { describe, expect, it } from "vitest"
import { getClinicDashboardCapabilities } from "@/features/clinic-dashboard/prototype/public"
import {
  selectClinicDashboardNavigationItems,
  selectSafeClinicDashboardSection,
} from "@/features/clinic-dashboard/workspace/navigation"

describe("clinic dashboard workspace navigation", () => {
  it("keeps visual-reference destinations unique and ordered", () => {
    const capabilities = getClinicDashboardCapabilities("visual-reference")
    const items = selectClinicDashboardNavigationItems({
      showSubscriptionsPlaceholder: capabilities.showSubscriptionsPlaceholder,
    })
    const ids = items.map(({ id }) => id)

    expect(ids).toEqual(["dashboard", "messages", "reviews", "profile", "subscriptions"])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("uses the typed capability to hide Subscriptions in presentation mode", () => {
    const visualReference = getClinicDashboardCapabilities("visual-reference")
    const presentation = getClinicDashboardCapabilities("presentation")

    expect(
      selectClinicDashboardNavigationItems({
        showSubscriptionsPlaceholder: visualReference.showSubscriptionsPlaceholder,
      }),
    ).toContainEqual({ id: "subscriptions", label: "Subscriptions" })
    const presentationItems = selectClinicDashboardNavigationItems({
      showSubscriptionsPlaceholder: presentation.showSubscriptionsPlaceholder,
    })

    expect(presentationItems).not.toContainEqual({ id: "subscriptions", label: "Subscriptions" })
    expect(presentationItems.map(({ id }) => id)).toEqual(["dashboard", "messages", "reviews", "profile"])
  })

  it("returns to Dashboard when the current destination is gated", () => {
    const presentation = getClinicDashboardCapabilities("presentation")
    const presentationItems = selectClinicDashboardNavigationItems({
      showSubscriptionsPlaceholder: presentation.showSubscriptionsPlaceholder,
    })

    expect(selectSafeClinicDashboardSection("subscriptions", presentationItems)).toBe("dashboard")
    expect(selectSafeClinicDashboardSection("reviews", presentationItems)).toBe("reviews")
  })
})
