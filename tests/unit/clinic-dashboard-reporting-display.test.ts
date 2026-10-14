import { describe, expect, it } from "vitest"
import {
  createCountMetricDisplay,
  createMetricValueDisplay,
  createSessionConversionDisplay,
} from "@/features/clinic-dashboard/dashboard/model/clinic-dashboard-reporting-display"

describe("clinic dashboard reporting display", () => {
  it("describes conversion comparisons as percentage points rather than relative change", () => {
    const display = createSessionConversionDisplay({
      source: "posthog",
      current: { state: "available", denominatorSessions: 200, numeratorSessions: 9, ratePercent: 4.5 },
      comparison: {
        state: "available",
        denominatorSessions: 180,
        numeratorSessions: 6,
        ratePercent: 3.3,
        percentagePointDelta: 1.2,
      },
    })
    expect(display.comparison).toBe("+1.2 percentage points compared with the previous period")
  })
  it("explains incomplete comparison history while retaining the current count", () => {
    const display = createCountMetricDisplay({
      current: { state: "available", value: 12 },
      comparison: { state: "partial_coverage", value: null, absoluteDelta: null, relativeDeltaPercent: null },
    })
    expect(display.value).toBe("12")
    expect(display.comparison).toBeUndefined()
    expect(display.information).toContain("Comparison not yet available")
  })
  it("does not claim a conversion percentage without profile-view sessions", () => {
    const display = createSessionConversionDisplay({
      source: "posthog",
      current: { state: "zero_denominator", denominatorSessions: 0, numeratorSessions: 0, ratePercent: null },
      comparison: {
        state: "zero_denominator",
        denominatorSessions: 0,
        numeratorSessions: 0,
        ratePercent: null,
        percentagePointDelta: null,
      },
    })
    expect(display.value).toBe("Not available")
    expect(display.detail).toBe("No profile-view sessions were recorded.")
    expect(display.comparison).toBeUndefined()
  })
  it("shows an available zero as zero", () => {
    expect(createMetricValueDisplay({ state: "available", value: 0 })).toEqual({
      detail: undefined,
      value: "0",
    })
  })

  it.each([
    ["source_unavailable", "Data source unavailable"],
    ["partial_coverage", "Incomplete data coverage"],
  ] as const)("keeps %s values unknown instead of rendering zero", (state, detail) => {
    expect(createMetricValueDisplay({ state, value: null })).toEqual({ detail, value: "Not available" })
  })

  it("shows a comparison only when the contract supplies complete values", () => {
    expect(
      createCountMetricDisplay({
        comparison: {
          absoluteDelta: 0,
          relativeDeltaPercent: 0,
          state: "available",
          value: 12,
        },
        current: { state: "available", value: 12 },
      }).comparison,
    ).toBe("No change compared with the previous period")

    expect(
      createCountMetricDisplay({
        comparison: {
          absoluteDelta: null,
          relativeDeltaPercent: null,
          state: "partial_coverage",
          value: null,
        },
        current: { state: "available", value: 12 },
      }).comparison,
    ).toBeUndefined()
  })
})
