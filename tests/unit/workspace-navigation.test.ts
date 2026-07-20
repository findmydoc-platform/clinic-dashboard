import { describe, expect, it } from "vitest"
import { getClinicDashboardDemoInteractionPolicy } from "@/features/clinic-dashboard/prototype/public"
import {
  selectClinicDashboardNavigationItems,
  selectSafeClinicDashboardSection,
} from "@/features/clinic-dashboard/workspace/navigation"

describe("clinic dashboard workspace navigation", () => {
  it("keeps visual-reference destinations unique and ordered", () => {
    const capabilities = getClinicDashboardDemoInteractionPolicy("visual-reference")
    const items = selectClinicDashboardNavigationItems({
      showCertificatesAccreditationsPlaceholder: capabilities.showCertificatesAccreditationsPlaceholder,
      showSubscriptionsPlaceholder: capabilities.showSubscriptionsPlaceholder,
    })
    const ids = items.map(({ id }) => id)

    expect(ids).toEqual([
      "dashboard",
      "messages",
      "reviews",
      "profile",
      "subscriptions",
      "certificates-accreditations",
    ])
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("keeps read-only future placeholders visible in presentation mode", () => {
    const visualReference = getClinicDashboardDemoInteractionPolicy("visual-reference")
    const presentation = getClinicDashboardDemoInteractionPolicy("presentation")

    expect(
      selectClinicDashboardNavigationItems({
        showCertificatesAccreditationsPlaceholder: visualReference.showCertificatesAccreditationsPlaceholder,
        showSubscriptionsPlaceholder: visualReference.showSubscriptionsPlaceholder,
      }),
    ).toContainEqual({ id: "subscriptions", label: "Subscriptions" })
    const presentationItems = selectClinicDashboardNavigationItems({
      showCertificatesAccreditationsPlaceholder: presentation.showCertificatesAccreditationsPlaceholder,
      showSubscriptionsPlaceholder: presentation.showSubscriptionsPlaceholder,
    })

    expect(presentationItems).toContainEqual({ id: "subscriptions", label: "Subscriptions" })
    expect(presentationItems).toContainEqual({
      id: "certificates-accreditations",
      label: "Credentials",
    })
    expect(presentationItems.map(({ id }) => id)).toEqual([
      "dashboard",
      "messages",
      "reviews",
      "profile",
      "subscriptions",
      "certificates-accreditations",
    ])
  })

  it("filters both future destinations independently", () => {
    expect(
      selectClinicDashboardNavigationItems({
        showCertificatesAccreditationsPlaceholder: false,
        showSubscriptionsPlaceholder: true,
      }).map(({ id }) => id),
    ).toEqual(["dashboard", "messages", "reviews", "profile", "subscriptions"])
    expect(
      selectClinicDashboardNavigationItems({
        showCertificatesAccreditationsPlaceholder: true,
        showSubscriptionsPlaceholder: false,
      }).map(({ id }) => id),
    ).toEqual(["dashboard", "messages", "reviews", "profile", "certificates-accreditations"])
  })

  it("returns to Dashboard only when a destination is absent", () => {
    const restrictedItems = selectClinicDashboardNavigationItems({
      showCertificatesAccreditationsPlaceholder: false,
      showSubscriptionsPlaceholder: false,
    })

    expect(selectSafeClinicDashboardSection("subscriptions", restrictedItems)).toBe("dashboard")
    expect(selectSafeClinicDashboardSection("certificates-accreditations", restrictedItems)).toBe("dashboard")
    expect(selectSafeClinicDashboardSection("reviews", restrictedItems)).toBe("reviews")
  })
})
