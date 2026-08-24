import { describe, expect, it } from "vitest"
import {
  getDemoGateIssue,
  getDemoVisibilityBehavior,
  type ClinicDashboardDemoGateId,
} from "@/features/clinic-dashboard/prototype/demo-interaction-policy"
import { isClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/prototype-mode"

const gateIds = [
  "certificatesAccreditationsPlaceholder",
  "dashboardReporting",
  "inquiryProfile",
  "messaging",
  "notifications",
  "profileWrites",
  "reviewManagement",
  "support",
  "subscriptionsPlaceholder",
  "teamWrites",
] as const satisfies ReadonlyArray<ClinicDashboardDemoGateId>

describe("clinic dashboard visibility contract", () => {
  it("exposes only the visual-reference and presentation prototype modes", () => {
    expect(isClinicDashboardPrototypeMode("visual-reference")).toBe(true)
    expect(isClinicDashboardPrototypeMode("presentation")).toBe(true)
    expect(isClinicDashboardPrototypeMode("mvp")).toBe(false)
  })

  it("links every temporary gate to an existing website issue", () => {
    for (const gate of gateIds) {
      expect(getDemoGateIssue(gate)).toMatch(
        /^https:\/\/github\.com\/findmydoc-platform\/website\/issues\/\d+$/,
      )
    }
  })

  it("keeps the full visual reference while gating presentation controls", () => {
    for (const gate of gateIds.filter(
      (gate) => gate !== "subscriptionsPlaceholder" && gate !== "certificatesAccreditationsPlaceholder",
    )) {
      expect(getDemoVisibilityBehavior("visual-reference", gate)).toBe("interactive")
    }

    expect(getDemoVisibilityBehavior("visual-reference", "subscriptionsPlaceholder")).toBe("read-only")
    expect(getDemoVisibilityBehavior("visual-reference", "certificatesAccreditationsPlaceholder")).toBe(
      "read-only",
    )

    expect(getDemoVisibilityBehavior("presentation", "messaging")).toBe("interactive")
    expect(getDemoVisibilityBehavior("presentation", "certificatesAccreditationsPlaceholder")).toBe(
      "read-only",
    )
    expect(getDemoVisibilityBehavior("presentation", "notifications")).toBe("interactive")
    expect(getDemoVisibilityBehavior("presentation", "profileWrites")).toBe("interactive")
    expect(getDemoVisibilityBehavior("presentation", "support")).toBe("interactive")
    expect(getDemoVisibilityBehavior("presentation", "subscriptionsPlaceholder")).toBe("read-only")
    expect(getDemoVisibilityBehavior("presentation", "teamWrites")).toBe("interactive")
  })
})
