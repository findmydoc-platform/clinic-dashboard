import { describe, expect, it } from "vitest"
import {
  formatReportingObservationTimestamp,
  createCountMetricDisplay,
  createMetricValueDisplay,
} from "@/features/clinic-dashboard/dashboard/model/clinic-dashboard-reporting-display"

describe("clinic dashboard reporting display", () => {
  it("formats the observation in the reporting timezone across the date boundary", () => {
    expect(formatReportingObservationTimestamp("2026-12-31T23:07:00Z", "Europe/Berlin")).toBe(
      "1 Jan 2027, 00:07",
    )
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
