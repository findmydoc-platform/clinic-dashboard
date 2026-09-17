import { describe, expect, it } from "vitest"
import {
  createCountMetricDisplay,
  createMetricValueDisplay,
} from "@/features/clinic-dashboard/dashboard/model/clinic-dashboard-reporting-display"

describe("clinic dashboard reporting display", () => {
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
