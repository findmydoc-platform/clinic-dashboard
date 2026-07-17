"use client"

import { MoveHorizontal } from "lucide-react"
import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import type { DashboardChartPoint } from "../../model/reporting"
import { createDashboardChartGeometry } from "../../model/chart-geometry"

type DashboardMetricChartProps = Readonly<{
  description: string
  points: readonly DashboardChartPoint[]
  valueLabels: Readonly<{
    plural: string
    singular: string
  }>
}>

function formatPointValue(value: number, valueLabels: DashboardMetricChartProps["valueLabels"]) {
  return `${value.toLocaleString("en-US")} ${value === 1 ? valueLabels.singular : valueLabels.plural}`
}

export function DashboardMetricChart({ description, points, valueLabels }: DashboardMetricChartProps) {
  const gradientId = useId().replaceAll(":", "")
  const scrollHintId = useId()
  const pointRefs = useRef<Array<SVGGElement | null>>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [tabIndex, setTabIndex] = useState(0)
  const chartWidth = Math.max(600, (points.length - 1) * 52 + 60)
  const { area, coordinates, line } = createDashboardChartGeometry(points, chartWidth)
  const activePoint = activeIndex === null ? undefined : coordinates[activeIndex]

  const focusPoint = (index: number) => {
    setTabIndex(index)
    pointRefs.current[index]?.focus()
  }

  const handlePointKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    let nextIndex: number | undefined

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % coordinates.length
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + coordinates.length) % coordinates.length
    } else if (event.key === "Home") {
      nextIndex = 0
    } else if (event.key === "End") {
      nextIndex = coordinates.length - 1
    }

    if (typeof nextIndex === "number") {
      event.preventDefault()
      focusPoint(nextIndex)
    }
  }

  const handlePointMouseLeave = (event: MouseEvent<SVGGElement>) => {
    if (document.activeElement !== event.currentTarget) setActiveIndex(null)
  }

  return (
    <div className="max-w-full">
      <p
        className="mb-2 flex items-center gap-2 text-xs text-[var(--foreground)] sm:hidden"
        id={scrollHintId}
      >
        <MoveHorizontal aria-hidden="true" className="size-4 shrink-0" />
        Swipe or scroll to view every date.
      </p>
      <div className="max-w-full overflow-x-auto pb-2" data-chart-scroll>
        <svg
          aria-describedby={scrollHintId}
          aria-label={description}
          className="h-64 w-full"
          role="group"
          style={{ minWidth: `${chartWidth}px` }}
          viewBox={`0 0 ${chartWidth} 280`}
        >
          <title>{description}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[55, 125, 195, 265].map((y) => (
            <line key={y} stroke="var(--border)" x1="30" x2={chartWidth - 30} y1={y} y2={y} />
          ))}
          <polygon fill={`url(#${gradientId})`} points={area} />
          <polyline
            fill="none"
            points={line}
            stroke="var(--primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          />
          {coordinates.map((point, index) => {
            const pointValue = formatPointValue(point.value, valueLabels)

            return (
              <g
                aria-label={`${point.dateLabel}: ${pointValue}`}
                className="outline-none focus:outline-none focus-visible:outline-none"
                data-chart-point={point.dateLabel}
                key={point.dateLabel}
                onBlur={() => setActiveIndex(null)}
                onClick={() => focusPoint(index)}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handlePointKeyDown(event, index)}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={handlePointMouseLeave}
                ref={(element) => {
                  pointRefs.current[index] = element
                }}
                role="img"
                tabIndex={tabIndex === index ? 0 : -1}
              >
                <circle
                  className="cursor-pointer"
                  cx={point.x}
                  cy={point.y}
                  data-chart-point-hit-target
                  fill="transparent"
                  r="25"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  fill={activeIndex === index ? "var(--accent)" : "var(--background)"}
                  pointerEvents="none"
                  r={activeIndex === index ? 7 : 5}
                  stroke={activeIndex === index ? "var(--accent-foreground)" : "var(--primary)"}
                  strokeWidth={activeIndex === index ? 4 : 3}
                />
                {point.axisLabel ? (
                  <text fill="var(--foreground)" fontSize="11" textAnchor="middle" x={point.x} y="270">
                    {point.axisLabel}
                  </text>
                ) : null}
              </g>
            )
          })}
          {activePoint ? (
            <g
              aria-label={`${activePoint.dateLabel}: ${formatPointValue(activePoint.value, valueLabels)}`}
              pointerEvents="none"
              role="tooltip"
              transform={`translate(${Math.min(Math.max(activePoint.x - 80, 8), chartWidth - 168)} ${
                activePoint.y < 80 ? activePoint.y + 18 : activePoint.y - 62
              })`}
            >
              <rect fill="var(--background)" height="50" rx="8" stroke="var(--border)" width="160" />
              <text fill="var(--foreground)" fontSize="12" fontWeight="700" textAnchor="middle" x="80" y="20">
                {activePoint.dateLabel}
              </text>
              <text fill="var(--primary)" fontSize="12" fontWeight="700" textAnchor="middle" x="80" y="38">
                {formatPointValue(activePoint.value, valueLabels)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  )
}
