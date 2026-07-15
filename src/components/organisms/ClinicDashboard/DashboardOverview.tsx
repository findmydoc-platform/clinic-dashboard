"use client"

import Image from "next/image"
import { useId } from "react"
import { ArrowRight, CheckCircle2, Download, Lightbulb, MapPin } from "lucide-react"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import { RatingStars, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { MetricCard, SurfaceCard } from "@/components/molecules/DashboardCards"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { getGateIssue, isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import type { DashboardReportingPeriod } from "@/lib/clinic-dashboard/reporting"
import { cn } from "@/lib/utils"

const taskPriorityStyles = {
  High: "bg-[var(--destructive)]",
  Low: "bg-[var(--accent)]",
  Medium: "bg-[var(--warning)]",
} as const

export function DashboardOverview({
  period,
  variant,
}: {
  period: DashboardReportingPeriod
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.dashboard
  const reporting = data.reporting[period]
  const showReportingControls = isGateVisible(variant, "dashboardReporting")
  const showLaterScope = isGateVisible(variant, "laterScope")
  const chartGradientId = useId().replaceAll(":", "")
  const chartLeft = 30
  const chartRight = 570
  const chartTop = 25
  const chartBottom = 235
  const chartMaximum = Math.max(...reporting.chart.points.map((point) => point.value)) * 1.1
  const chartCoordinates = reporting.chart.points.map((point, index, points) => {
    const x = chartLeft + (index / Math.max(points.length - 1, 1)) * (chartRight - chartLeft)
    const y = chartBottom - (point.value / chartMaximum) * (chartBottom - chartTop)

    return { ...point, x, y }
  })
  const chartLine = chartCoordinates.map(({ x, y }) => `${x},${y}`).join(" ")
  const chartArea = `${chartLeft},${chartBottom} ${chartLine} ${chartRight},${chartBottom}`

  return (
    <div className="space-y-6" data-visibility-owner={getGateIssue("dashboardReporting")}>
      <WorkspaceHeading description="A clear view of your clinic's visibility, enquiries, and profile health.">
        Dashboard
      </WorkspaceHeading>

      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {reporting.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-[var(--secondary)] sm:text-2xl">
            Conversion funnel ({period})
          </h2>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--secondary)]">
            <span className="size-2 rounded-full bg-[var(--accent)]" /> Process optimization active
          </span>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-5 xl:p-5">
          {reporting.funnel.map((step, index) => (
            <div
              className={cn(
                "relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center",
                index === reporting.funnel.length - 1 &&
                  "border-[var(--primary)] bg-[var(--primary)] text-white",
              )}
              key={step.label}
            >
              <CheckCircle2
                aria-hidden="true"
                className={cn(
                  "mx-auto size-6 text-[var(--primary)]",
                  index === reporting.funnel.length - 1 && "text-white",
                )}
              />
              {"conversion" in step && step.conversion ? (
                <span
                  className={cn(
                    "mt-3 block text-xs font-bold text-[var(--primary)]",
                    index === reporting.funnel.length - 1 && "text-white",
                  )}
                >
                  {step.conversion}
                </span>
              ) : null}
              <strong className="mt-2 block text-2xl tracking-tight">{step.value}</strong>
              <span
                className={cn(
                  "text-[10px] tracking-wide text-[var(--foreground)] uppercase",
                  index === reporting.funnel.length - 1 && "text-white",
                )}
              >
                {step.label}
              </span>
              {index < reporting.funnel.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute top-1/2 -right-3 z-10 hidden size-4 rounded-full bg-[var(--background)] p-0.5 text-[var(--foreground)] xl:block"
                />
              ) : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr_0.8fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Profile progress</h2>
            <strong className="text-[var(--primary)]">82%</strong>
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            {data.profileTasks.map((task) => (
              <div
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-[var(--surface)]"
                key={task.label}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn("size-2 shrink-0 rounded-full", taskPriorityStyles[task.priority])}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{task.label}</div>
                    <div className="mt-0.5 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                      {task.priority} priority
                    </div>
                  </div>
                </div>
                {showReportingControls &&
                (!task.label.toLowerCase().includes("certificate") || showLaterScope) ? (
                  <Button size="small" variant="ghost">
                    Resolve
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_25%,white)] bg-[color-mix(in_srgb,var(--primary)_6%,white)] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--secondary)]">
                <Lightbulb aria-hidden="true" className="size-4" /> Tip
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--foreground)]">
                Complete profiles receive more qualified inquiries.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
            <div>
              <h2 className="text-xl font-bold text-[var(--secondary)]">Profile views over time</h2>
              <p className="mt-1 text-xs font-bold text-[var(--primary)]">{reporting.chart.comparison}</p>
            </div>
            {showReportingControls ? (
              <Button aria-label="Download profile views" size="icon" variant="ghost">
                <Download aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="p-5">
            <svg
              aria-label={reporting.chart.description}
              className="h-64 w-full"
              role="img"
              viewBox="0 0 600 280"
            >
              <title>{reporting.chart.description}</title>
              <defs>
                <linearGradient id={chartGradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
                  <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[55, 125, 195, 265].map((y) => (
                <line key={y} stroke="var(--border)" x1="30" x2="570" y1={y} y2={y} />
              ))}
              <polygon fill={`url(#${chartGradientId})`} points={chartArea} />
              <polyline
                fill="none"
                points={chartLine}
                stroke="var(--primary)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="5"
              />
              {chartCoordinates.map((point) =>
                point.axisLabel ? (
                  <g key={point.dateLabel}>
                    <circle cx={point.x} cy={point.y} fill="var(--primary)" r="4" />
                    <text fill="var(--foreground)" fontSize="11" textAnchor="middle" x={point.x} y="270">
                      {point.axisLabel}
                    </text>
                  </g>
                ) : null,
              )}
            </svg>
            <dl className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
              {reporting.chart.summary.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-[var(--foreground)]">{item.label}</dt>
                  <dd className="font-bold text-[var(--primary)]">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="p-5">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Reviews</h2>
            <div className="mt-5 flex items-center gap-3">
              <strong className="text-4xl">{data.rating.value}</strong>
              <div>
                <RatingStars value={data.rating.value} />
                <div className="text-xs text-[var(--foreground)]">
                  ({data.rating.count.toLocaleString("en-US")} total reviews)
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold text-[var(--primary)]">{reporting.reviewActivity}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.rating.categories.map((category) => (
                <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold" key={category}>
                  {category}
                </span>
              ))}
            </div>
          </SurfaceCard>
          <SurfaceCard className="overflow-hidden">
            <div className="relative h-28">
              <Image
                alt="Exterior of Berlin Health Clinic"
                className="object-cover"
                fill
                priority
                sizes="(min-width: 1280px) 280px, 100vw"
                src={exteriorImage}
              />
            </div>
            <div className="p-5">
              <div className="text-xs font-bold text-[var(--foreground)]">Public clinic preview</div>
              <div className="mt-2 flex items-center justify-between">
                <strong>Berlin Health</strong>
                <span className="font-bold text-[var(--primary)]">4.8 ★</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-[var(--foreground)]">
                <MapPin aria-hidden="true" className="size-3" /> Mitte, Berlin
              </div>
              {showReportingControls ? <Button className="mt-4 w-full">Open preview</Button> : null}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
