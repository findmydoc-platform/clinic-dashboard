"use client"

import { useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react"
import type { DashboardChartPoint } from "../../model/reporting"
import { createProfileViewsChartGeometry } from "../../model/chart-geometry"

type ProfileViewsChartProps = Readonly<{
  description: string
  points: readonly DashboardChartPoint[]
}>

export function ProfileViewsChart({ description, points }: ProfileViewsChartProps) {
  const gradientId = useId().replaceAll(":", "")
  const pointRefs = useRef<Array<SVGGElement | null>>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [tabIndex, setTabIndex] = useState(0)
  const { area, coordinates, line } = createProfileViewsChartGeometry(points)
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
    <div className="max-w-full overflow-x-auto pb-2">
      <svg
        aria-label={description}
        className="h-64 w-full min-w-[600px] sm:min-w-0"
        role="group"
        viewBox="0 0 600 280"
      >
        <title>{description}</title>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[55, 125, 195, 265].map((y) => (
          <line key={y} stroke="var(--border)" x1="30" x2="570" y1={y} y2={y} />
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
        {coordinates.map((point, index) => (
          <g
            aria-label={`${point.dateLabel}: ${point.value.toLocaleString("en-US")} profile views`}
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
            <circle className="cursor-pointer" cx={point.x} cy={point.y} fill="transparent" r="14" />
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
        ))}
        {activePoint ? (
          <g
            aria-label={`${activePoint.dateLabel}: ${activePoint.value.toLocaleString("en-US")} profile views`}
            pointerEvents="none"
            role="tooltip"
            transform={`translate(${Math.min(Math.max(activePoint.x - 80, 8), 432)} ${
              activePoint.y < 80 ? activePoint.y + 18 : activePoint.y - 62
            })`}
          >
            <rect fill="var(--background)" height="50" rx="8" stroke="var(--border)" width="160" />
            <text fill="var(--foreground)" fontSize="12" fontWeight="700" textAnchor="middle" x="80" y="20">
              {activePoint.dateLabel}
            </text>
            <text fill="var(--primary)" fontSize="12" fontWeight="700" textAnchor="middle" x="80" y="38">
              {activePoint.value.toLocaleString("en-US")} profile views
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
}
