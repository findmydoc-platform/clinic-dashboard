import type { DashboardChartPoint } from "./reporting"

const dashboardChartBounds = {
  bottom: 235,
  left: 30,
  top: 25,
} as const

export type DashboardChartCoordinate = DashboardChartPoint &
  Readonly<{
    x: number
    y: number
  }>

export type DashboardChartGeometry = Readonly<{
  area: string
  coordinates: readonly DashboardChartCoordinate[]
  line: string
}>

export function createDashboardChartGeometry(
  points: readonly DashboardChartPoint[],
  width = 600,
): DashboardChartGeometry {
  const { bottom, left, top } = dashboardChartBounds
  const right = width - left
  const maximumValue = Math.max(0, ...points.map((point) => point.value))
  const chartMaximum = maximumValue * 1.1
  const coordinates = points.map((point, index) => {
    const x = left + (index / Math.max(points.length - 1, 1)) * (right - left)
    const y = chartMaximum === 0 ? bottom : bottom - (point.value / chartMaximum) * (bottom - top)

    return { ...point, x, y }
  })
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(" ")
  const area = line ? `${left},${bottom} ${line} ${right},${bottom}` : ""

  return { area, coordinates, line }
}
