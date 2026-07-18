import { describe, expect, it } from "vitest"
import { createDashboardChartGeometry } from "@/features/clinic-dashboard/dashboard/model/chart-geometry"

describe("createDashboardChartGeometry", () => {
  it("maps values across the complete chart bounds", () => {
    const geometry = createDashboardChartGeometry([
      { dateLabel: "First", value: 10 },
      { dateLabel: "Middle", value: 15 },
      { dateLabel: "Last", value: 20 },
    ])

    expect(geometry.coordinates.map((point) => point.x)).toEqual([30, 300, 570])
    expect(geometry.coordinates[0]?.y).toBeCloseTo(139.55, 2)
    expect(geometry.coordinates[2]?.y).toBeCloseTo(44.09, 2)
    expect(geometry.line.split(" ")).toHaveLength(3)
    expect(geometry.area).toMatch(/^30,235 .* 570,235$/u)
  })

  it("returns empty SVG point strings when there are no chart points", () => {
    expect(createDashboardChartGeometry([])).toEqual({ area: "", coordinates: [], line: "" })
  })

  it("keeps zero values on the chart baseline", () => {
    const geometry = createDashboardChartGeometry([{ dateLabel: "No views", value: 0 }])

    expect(geometry.coordinates[0]).toMatchObject({ x: 30, y: 235 })
  })

  it("uses the requested chart height for the vertical plotting bounds", () => {
    const geometry = createDashboardChartGeometry(
      [
        { dateLabel: "Zero", value: 0 },
        { dateLabel: "Peak", value: 20 },
      ],
      600,
      416,
    )

    expect(geometry.coordinates[0]).toMatchObject({ x: 30, y: 371 })
    expect(geometry.coordinates[1]?.y).toBeCloseTo(56.45, 2)
    expect(geometry.area).toMatch(/^30,371 .* 570,371$/u)
  })

  it("keeps point centers at least 52 pixels apart on long timelines", () => {
    const geometry = createDashboardChartGeometry(
      Array.from({ length: 30 }, (_, index) => ({ dateLabel: `Day ${index + 1}`, value: index })),
      1_568,
    )

    expect((geometry.coordinates[1]?.x ?? 0) - (geometry.coordinates[0]?.x ?? 0)).toBe(52)
  })
})
