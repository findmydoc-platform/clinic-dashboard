import { describe, expect, it } from "vitest"
import {
  getGateIssue,
  getVisibilityBehavior,
  type ClinicDashboardGateId,
} from "@/features/clinic-dashboard/prototype/prototype-capabilities"
import { isClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/prototype-mode"

const gateIds = [
  "certificateTasks",
  "dashboardReporting",
  "inquiryProfile",
  "locationSwitching",
  "messaging",
  "notifications",
  "profileWrites",
  "reviewManagement",
  "support",
  "subscriptionsPlaceholder",
  "teamWrites",
] as const satisfies ReadonlyArray<ClinicDashboardGateId>

describe("clinic dashboard visibility contract", () => {
  it("exposes only the visual-reference and presentation prototype modes", () => {
    expect(isClinicDashboardPrototypeMode("visual-reference")).toBe(true)
    expect(isClinicDashboardPrototypeMode("presentation")).toBe(true)
    expect(isClinicDashboardPrototypeMode("mvp")).toBe(false)
  })

  it("links every temporary gate to an existing website issue", () => {
    for (const gate of gateIds) {
      expect(getGateIssue(gate)).toMatch(/^https:\/\/github\.com\/findmydoc-platform\/website\/issues\/\d+$/)
    }
  })

  it("keeps the full visual reference while gating presentation controls", () => {
    for (const gate of gateIds.filter((gate) => gate !== "subscriptionsPlaceholder")) {
      expect(getVisibilityBehavior("visual-reference", gate)).toBe("interactive")
    }

    expect(getVisibilityBehavior("visual-reference", "subscriptionsPlaceholder")).toBe("read-only")

    expect(getVisibilityBehavior("presentation", "messaging")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "locationSwitching")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "certificateTasks")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "notifications")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "profileWrites")).toBe("read-only")
    expect(getVisibilityBehavior("presentation", "support")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "subscriptionsPlaceholder")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "teamWrites")).toBe("read-only")
  })
})
