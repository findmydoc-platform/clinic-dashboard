"use client"

import Image from "next/image"
import { ArrowRight, CheckCircle2, Download, Lightbulb, MapPin } from "lucide-react"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import { RatingStars } from "@/components/atoms/DashboardPrimitives"
import { MetricCard, SurfaceCard } from "@/components/molecules/DashboardCards"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { getGateIssue, isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"

export function DashboardOverview({ variant }: { variant: ClinicDashboardVariant }) {
  const data = clinicDashboardFixture.dashboard
  const showReportingControls = isGateVisible(variant, "dashboardReporting")
  const showLaterScope = isGateVisible(variant, "laterScope")

  return (
    <div className="space-y-6" data-visibility-owner={getGateIssue("dashboardReporting")}>
      <h1 className="sr-only">Dashboard</h1>
      {showReportingControls ? (
        <div className="flex justify-end">
          <div aria-label="Reporting period" className="flex rounded-lg bg-[var(--surface)] p-1" role="group">
            {["7 days", "30 days", "90 days"].map((period) => (
              <Button
                className="h-9"
                key={period}
                size="small"
                variant={period === "30 days" ? "primary" : "ghost"}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <section aria-label="Dashboard metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-[var(--secondary)] sm:text-2xl">
            Conversion funnel (30 days)
          </h2>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--secondary)]">
            <span className="size-2 rounded-full bg-[var(--accent)]" /> Process optimization active
          </span>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
          {data.funnel.map((step, index) => (
            <div className="relative rounded-xl bg-[var(--surface)] p-5 text-center" key={step.label}>
              <CheckCircle2 aria-hidden="true" className="mx-auto size-7 text-[var(--primary)]" />
              {"conversion" in step && step.conversion ? (
                <span className="mt-3 block text-xs font-bold text-[var(--primary)]">{step.conversion}</span>
              ) : null}
              <strong className="mt-2 block text-xl">{step.value}</strong>
              <span className="text-xs tracking-wide text-[var(--foreground)] uppercase">
                {step.label}
              </span>
              {index < data.funnel.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="absolute top-1/2 -right-5 z-10 hidden size-4 text-[var(--foreground)] xl:block"
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
          <div className="space-y-5 p-5">
            {data.profileTasks.map((task) => (
              <div className="flex items-center justify-between gap-3" key={task.label}>
                <div>
                  <div className="text-sm font-bold">{task.label}</div>
                  <div className="mt-1 text-[10px] font-bold tracking-wide text-[var(--secondary)] uppercase">
                    {task.priority}
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
              <p className="mt-1 text-xs font-bold text-[var(--primary)]">+12% vs. previous year</p>
            </div>
            {showReportingControls ? (
              <Button aria-label="Download profile views" size="icon" variant="ghost">
                <Download aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="p-5">
            <svg
              aria-label="Profile views line chart"
              className="h-64 w-full"
              role="img"
              viewBox="0 0 600 280"
            >
              <defs>
                <linearGradient id="dashboard-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--primary)" stopOpacity=".25" />
                  <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[55, 125, 195, 265].map((y) => (
                <line key={y} stroke="var(--border)" x1="30" x2="570" y1={y} y2={y} />
              ))}
              <path
                d="M30 250 C85 170 115 95 170 165 S225 270 270 120 S335 25 385 145 S465 235 520 75 L520 265 L30 265 Z"
                fill="url(#dashboard-area)"
              />
              <path
                d="M30 250 C85 170 115 95 170 165 S225 270 270 120 S335 25 385 145 S465 235 520 75"
                fill="none"
                stroke="var(--primary)"
                strokeLinecap="round"
                strokeWidth="10"
              />
            </svg>
            <dl className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-4">
              {data.chart.summary.map((item) => (
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
                <div className="text-xs text-[var(--foreground)]">({data.rating.count})</div>
              </div>
            </div>
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
