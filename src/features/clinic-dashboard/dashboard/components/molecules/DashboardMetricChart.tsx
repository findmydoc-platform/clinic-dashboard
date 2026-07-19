"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
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
  const chartViewportRef = useRef<HTMLDivElement | null>(null)
  const pointRefs = useRef<Array<SVGGElement | null>>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [chartWidth, setChartWidth] = useState(600)
  const [tabIndex, setTabIndex] = useState(0)
  const chartHeight = 416
  const chartGridLines = [0.15, 0.4, 0.65, 0.9].map((position) => position * chartHeight)
  const { area, coordinates, line } = createDashboardChartGeometry(points, chartWidth, chartHeight)
  const activePoint = activeIndex === null ? undefined : coordinates[activeIndex]

  useEffect(() => {
    const viewport = chartViewportRef.current

    if (!viewport) return

    const updateChartWidth = () => {
      const nextWidth = viewport.getBoundingClientRect().width

      if (nextWidth > 0) {
        setChartWidth((currentWidth) => (Math.abs(currentWidth - nextWidth) < 0.5 ? currentWidth : nextWidth))
      }
    }

    updateChartWidth()
    const resizeObserver = new ResizeObserver(updateChartWidth)
    resizeObserver.observe(viewport)

    return () => resizeObserver.disconnect()
  }, [])

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
      <div className="max-w-full overflow-hidden pb-2" data-chart-viewport ref={chartViewportRef}>
        <svg
          aria-label={description}
          className="h-[26rem] w-full"
          role="group"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <title>{description}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chartGridLines.map((y) => (
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
            const previousPoint = coordinates[index - 1]
            const nextPoint = coordinates[index + 1]
            const hitTargetStart = previousPoint ? (previousPoint.x + point.x) / 2 : 0
            const hitTargetEnd = nextPoint ? (point.x + nextPoint.x) / 2 : chartWidth

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
                <rect
                  className="cursor-pointer"
                  data-chart-point-hit-target
                  fill="transparent"
                  height={chartHeight}
                  width={Math.max(hitTargetEnd - hitTargetStart, 1)}
                  x={hitTargetStart}
                  y="0"
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
                  <text
                    data-chart-axis-label
                    fill="var(--foreground)"
                    fontSize="11"
                    textAnchor="middle"
                    x={point.x}
                    y={chartHeight - 10}
                  >
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
