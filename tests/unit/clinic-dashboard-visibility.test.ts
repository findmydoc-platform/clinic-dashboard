import { describe, expect, it } from "vitest"
import {
  getGateIssue,
  getVisibilityBehavior,
  isClinicDashboardVariant,
  type ClinicDashboardGateId,
} from "@/lib/clinic-dashboard/visibility"

const gateIds = [
  "dashboardReporting",
  "inquiryProfile",
  "laterScope",
  "messaging",
  "profileWrites",
  "reviewManagement",
  "teamWrites",
] as const satisfies ReadonlyArray<ClinicDashboardGateId>

describe("clinic dashboard visibility contract", () => {
  it("exposes only the visual-reference and presentation variants", () => {
    expect(isClinicDashboardVariant("visual-reference")).toBe(true)
    expect(isClinicDashboardVariant("presentation")).toBe(true)
    expect(isClinicDashboardVariant("mvp")).toBe(false)
  })

  it("links every temporary gate to an existing website issue", () => {
    for (const gate of gateIds) {
      expect(getGateIssue(gate)).toMatch(/^https:\/\/github\.com\/findmydoc-platform\/website\/issues\/\d+$/)
    }
  })

  it("keeps the full visual reference while gating presentation controls", () => {
    for (const gate of gateIds) {
      expect(getVisibilityBehavior("visual-reference", gate)).toBe("interactive")
    }

    expect(getVisibilityBehavior("presentation", "messaging")).toBe("hidden")
    expect(getVisibilityBehavior("presentation", "profileWrites")).toBe("read-only")
    expect(getVisibilityBehavior("presentation", "teamWrites")).toBe("read-only")
  })
})
