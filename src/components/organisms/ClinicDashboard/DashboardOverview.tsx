"use client"

import Image from "next/image"
import {
  ArrowDown,
  ArrowRight,
  CircleDot,
  Eye,
  FileCheck2,
  Lightbulb,
  MapPin,
  MessageSquare,
  MessageSquareReply,
  MousePointerClick,
  UserRound,
} from "lucide-react"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import { RatingStars, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { MetricCard, SurfaceCard } from "@/components/molecules/DashboardCards"
import { ProfileViewsChart } from "@/components/molecules/ProfileViewsChart"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import type { DashboardProfileTask } from "@/lib/clinic-dashboard/profile-tasks"
import { getGateIssue, isGateVisible, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import type { DashboardReportingPeriod } from "@/lib/clinic-dashboard/reporting"
import { cn } from "@/lib/utils"

const taskPriorityStyles = {
  High: "bg-[var(--destructive)]",
  Low: "bg-[var(--accent)]",
  Medium: "bg-[var(--warning)]",
} as const

const funnelIcons = {
  Contacts: { component: MessageSquare, name: "message-square" },
  Impressions: { component: Eye, name: "eye" },
  Inquiries: { component: FileCheck2, name: "file-check" },
  "Profile views": { component: MousePointerClick, name: "mouse-pointer-click" },
  "Unique visitors": { component: UserRound, name: "user-round" },
} as const

export function DashboardOverview({
  onNavigateToReviews,
  onOpenProfileTask,
  period,
  variant,
}: {
  onNavigateToReviews: () => void
  onOpenProfileTask: (task: DashboardProfileTask, trigger: HTMLButtonElement) => void
  period: DashboardReportingPeriod
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.dashboard
  const reporting = data.reporting[period]
  const showReportingControls = isGateVisible(variant, "dashboardReporting")
  const showLaterScope = isGateVisible(variant, "laterScope")

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
          {reporting.funnel.map((step, index) => {
            const iconConfig = funnelIcons[step.label as keyof typeof funnelIcons] ?? {
              component: CircleDot,
              name: "circle-dot",
            }
            const FunnelIcon = iconConfig.component
            const final = index === reporting.funnel.length - 1

            return (
              <div
                className={cn(
                  "relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center",
                  final && "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]",
                )}
                key={step.label}
              >
                <FunnelIcon
                  aria-hidden="true"
                  className={cn("mx-auto size-6 text-[var(--primary)]", final && "text-[var(--on-primary)]")}
                  data-funnel-icon={iconConfig.name}
                />
                {"conversion" in step && step.conversion ? (
                  <span
                    className={cn(
                      "mt-3 block text-xs font-bold text-[var(--primary)]",
                      final && "text-[var(--on-primary)]",
                    )}
                  >
                    {step.conversion}
                  </span>
                ) : null}
                <strong className="mt-2 block text-2xl tracking-tight">{step.value}</strong>
                <span
                  className={cn(
                    "text-[10px] tracking-wide text-[var(--foreground)] uppercase",
                    final && "text-[var(--on-primary)]",
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
            )
          })}
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.7fr_0.8fr]">
        <SurfaceCard className="min-w-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Profile progress</h2>
            <strong className="text-[var(--primary)]">82%</strong>
          </div>
          <div className="space-y-2 p-3 sm:p-4">
            {data.profileTasks.map((task) => (
              <div
                aria-label={`${task.label} profile task`}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-[var(--surface)]"
                key={task.id}
                role="group"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn("size-2 shrink-0 rounded-full", taskPriorityStyles[task.priority])}
                  />
                  <div className="min-w-0">
                    <div className="text-sm leading-5 font-bold">{task.label}</div>
                    <div className="mt-0.5 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                      {task.priority} priority
                    </div>
                  </div>
                </div>
                {task.visibility === "always" || showLaterScope ? (
                  <Button
                    aria-label={
                      task.visibility === "full-interface"
                        ? `${task.actionLabel} for ${task.label}`
                        : undefined
                    }
                    className="shrink-0 whitespace-nowrap"
                    onClick={(event) => onOpenProfileTask(task, event.currentTarget)}
                    size="small"
                    variant="ghost"
                  >
                    {task.actionLabel}
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--primary)_25%,var(--background))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--background))] p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--secondary)]">
                <Lightbulb aria-hidden="true" className="size-4" /> Tip
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--foreground)]">
                Complete profiles receive more qualified inquiries.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="min-w-0">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
            <div>
              <h2 className="text-xl font-bold text-[var(--secondary)]">Profile views over time</h2>
              <p className="mt-1 text-xs font-bold text-[var(--primary)]">{reporting.chart.comparison}</p>
            </div>
            {showReportingControls ? (
              <Button aria-label="Download profile views" size="icon" variant="ghost">
                <ArrowDown aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </div>
          <div className="p-5">
            <ProfileViewsChart key={period} chart={reporting.chart} />
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
            <p className="mt-1 text-xs font-bold text-[var(--foreground)]">
              {data.rating.pendingResponses} response pending
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.rating.categories.map((category) => (
                <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold" key={category}>
                  {category}
                </span>
              ))}
            </div>
            <Button className="mt-5 w-full" onClick={onNavigateToReviews} variant="outline">
              <MessageSquareReply aria-hidden="true" className="size-4" />
              View reviews
            </Button>
          </SurfaceCard>
          <SurfaceCard className="overflow-hidden">
            <div className="relative h-28">
              <Image
                alt="Exterior of Berlin Health Clinic"
                className="object-cover"
                fill
                loading="eager"
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
