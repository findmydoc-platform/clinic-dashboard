import type { DashboardChartPoint } from "./reporting"

const profileViewsChartBounds = {
  bottom: 235,
  left: 30,
  right: 570,
  top: 25,
} as const

export type ProfileViewsChartCoordinate = DashboardChartPoint &
  Readonly<{
    x: number
    y: number
  }>

export type ProfileViewsChartGeometry = Readonly<{
  area: string
  coordinates: readonly ProfileViewsChartCoordinate[]
  line: string
}>

export function createProfileViewsChartGeometry(
  points: readonly DashboardChartPoint[],
): ProfileViewsChartGeometry {
  const { bottom, left, right, top } = profileViewsChartBounds
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
