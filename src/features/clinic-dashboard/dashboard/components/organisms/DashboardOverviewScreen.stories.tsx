import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { createDashboardOverview } from "../../dashboard-overview.mapper"
import {
  clinicDashboardReportingFixture,
  clinicDashboardReportingWithPartialCoverage,
  clinicDashboardReportingWithSourceUnavailable,
} from "../../testing/clinic-dashboard-reporting.fixtures"
import { dashboardProfileProgressReady } from "../../testing/dashboard.fixtures"
import {
  dashboardProfileProgressError,
  dashboardProfileProgressDraft,
  dashboardProfileProgressPublishReady,
} from "../../testing/dashboard.fixtures"
import { useDashboardOverviewController } from "../../hooks/useDashboardOverviewController"
import { ReportingPeriodControl } from "../molecules/ReportingPeriodControl"
import { DashboardOverviewScreen } from "./DashboardOverviewScreen"
import type { ClinicDashboardReporting } from "../../model/clinic-dashboard-reporting"

const previewFixture = {
  status: "available",
  name: "Controlled Bosphorus Clinic",
  location: "Istanbul, Türkiye",
  imageStatus: "empty",
} as const

const meta = {
  component: DashboardOverviewScreen,
  args: {
    inquiryInventory: { status: "ready", refreshState: "idle", count: 9 },
    reviewWorkload: {
      status: "ready",
      refreshState: "idle",
      workload: { reviewsToAnswerCount: 4, pendingModerationCount: 2 },
    },
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: {
        status: "available",
        name: "Controlled Bosphorus Clinic",
        location: "Istanbul, Türkiye",
        imageStatus: "empty",
      },
      selectedMetricId: "profileViews",
    }),
    onMetricSelect: fn(),
    onProfileTaskOpen: fn(),
    onProfileProgressRetry: fn(),
    onReviewsOpen: fn(),
    onReportingRetry: fn(),
  },
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Overview Screen",
} satisfies Meta<typeof DashboardOverviewScreen>

export default meta
type Story = StoryObj<typeof meta>

async function exerciseAvailable({ args, canvasElement }: Parameters<NonNullable<Story["play"]>>[0]) {
  const canvas = within(canvasElement)
  await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  const metrics = within(canvas.getByRole("region", { name: "Dashboard metrics" }))
  await expect(metrics.getByRole("button", { name: "Open inquiries" })).toBeVisible()
  await expect(metrics.getByRole("button", { name: "Reviews to answer" })).toBeVisible()
  await expect(metrics.queryByText("CTA interactions")).not.toBeInTheDocument()
  await expect(metrics.queryByText("Session conversion")).not.toBeInTheDocument()

  await expect(canvas.getByRole("heading", { name: "Public profile progress" })).toBeVisible()
  await expect(canvas.getByRole("list", { name: "Conversion stages" })).toBeVisible()
  await expect(canvas.getByText("Time series not available")).toBeVisible()
  await expect(canvas.getByRole("heading", { level: 2, name: "Public clinic preview" })).toBeVisible()
  await userEvent.click(canvas.getByRole("button", { name: "View details for Add clinic images" }))
  if (args.model.profileProgress.status !== "ready") throw new Error("Expected ready profile progress")
  await expect(args.onProfileTaskOpen).toHaveBeenCalledWith(args.model.profileProgress.tasks[0])
  await userEvent.click(canvas.getByRole("button", { name: "View reviews" }))
  await expect(args.onReviewsOpen).toHaveBeenCalledOnce()
  await expect(
    within(canvas.getByRole("list", { name: "Conversion stages" })).getAllByRole("listitem"),
  ).toHaveLength(4)
  await expect(canvas.getByRole("button", { name: /Impressions Not available/ })).toBeVisible()
  await expect(canvas.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument()
}

export const Available: Story = { play: exerciseAvailable }

export const TopKpiScope: Story = {
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Dashboard metrics" })
    const metrics = within(region)
    await expect(region.children).toHaveLength(3)
    await expect(metrics.getByRole("button", { name: "Open inquiries" })).toBeVisible()
    await expect(metrics.getByRole("button", { name: "Reviews to answer" })).toBeVisible()
    await expect(metrics.getByText("Public profile completion")).toBeVisible()
    await expect(metrics.getByText("67%", { exact: true })).toBeVisible()
    await expect(metrics.queryAllByRole("button")).toHaveLength(2)
    const [completion, first, second] = Array.from(region.children, (card) => card.getBoundingClientRect())
    const bounds = region.getBoundingClientRect()
    await expect(region.firstElementChild).toHaveTextContent("Public profile completion")
    await expect(completion.left).toBeCloseTo(bounds.left, 0)
    await expect(second.right).toBeCloseTo(bounds.right, 0)
    await expect(first.width).toBeCloseTo(second.width, 0)
    if (window.innerWidth >= 640) {
      await expect(first.height).toBeCloseTo(second.height, 0)
      const inquiryTitle = metrics.getByText("Open inquiries", { exact: true }).getBoundingClientRect()
      const reviewTitle = metrics.getByText("Reviews to answer", { exact: true }).getBoundingClientRect()
      await expect(inquiryTitle.top).toBeCloseTo(reviewTitle.top, 0)
      const inquiryValue = within(metrics.getByRole("button", { name: "Open inquiries" }))
        .getByText("9", { exact: true })
        .getBoundingClientRect()
      const reviewValue = within(metrics.getByRole("button", { name: "Reviews to answer" }))
        .getByText("4", { exact: true })
        .getBoundingClientRect()
      await expect(inquiryValue.top).toBeCloseTo(reviewValue.top, 0)
      if (window.innerWidth >= 1280) {
        await expect(completion.height).toBeCloseTo(first.height, 0)
        await expect(
          metrics.getByText("Public profile completion", { exact: true }).getBoundingClientRect().top,
        ).toBeCloseTo(inquiryTitle.top, 0)
        await expect(metrics.getByText("67%", { exact: true }).getBoundingClientRect().top).toBeCloseTo(
          inquiryValue.top,
          0,
        )
      }
    }
    await expect(first.height).toBeGreaterThanOrEqual(96)
    await expect(second.height).toBeGreaterThanOrEqual(96)
    if (window.innerWidth >= 1280) {
      await expect(completion.width).toBeCloseTo(first.width, 0)
      await expect(completion.top).toBeCloseTo(first.top, 0)
      await expect(first.top).toBeCloseTo(second.top, 0)
      await expect(first.left).toBeGreaterThanOrEqual(completion.right)
      await expect(second.left).toBeGreaterThanOrEqual(first.right)
    } else if (window.innerWidth >= 640) {
      await expect(completion.width).toBeCloseTo(bounds.width, 0)
      await expect(first.top).toBeGreaterThanOrEqual(completion.bottom)
      await expect(first.top).toBeCloseTo(second.top, 0)
      await expect(first.left).toBeCloseTo(bounds.left, 0)
      await expect(second.left).toBeGreaterThanOrEqual(first.right)
    } else {
      await expect(completion.width).toBeCloseTo(bounds.width, 0)
      await expect(first.width).toBeCloseTo(bounds.width, 0)
      await expect(first.top).toBeGreaterThanOrEqual(completion.bottom)
      await expect(second.top).toBeGreaterThanOrEqual(first.bottom)
    }
    await expect(args.onMetricSelect).not.toHaveBeenCalled()
    await expect(canvas.getByRole("button", { name: /Profile views 284/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    const firstStage = canvas.getByRole("button", { name: /Impressions Not available/ })
    firstStage.focus()
    await userEvent.keyboard("{Enter}")
    await expect(firstStage).toHaveFocus()
    await expect(getComputedStyle(firstStage).outlineWidth).toBe("2px")
    await expect(args.onMetricSelect).toHaveBeenCalledWith("impressions")
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

export const PartialComparisonExplanation: Story = {
  args: {
    model: createDashboardOverview({
      reporting: {
        status: "ready",
        reporting: {
          ...clinicDashboardReportingFixture,
          metrics: {
            ...clinicDashboardReportingFixture.metrics,
            profileViews: {
              ...clinicDashboardReportingFixture.metrics.profileViews,
              comparison: {
                state: "partial_coverage",
                value: null,
                absoluteDelta: null,
                relativeDeltaPercent: null,
              },
            },
          },
        },
      },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(document.body)
    await expect(canvas.getByRole("button", { name: /Profile views 284/ })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "About Profile views details" }))
    await expect(page.getByRole("dialog", { name: "About Profile views details" })).toHaveTextContent(
      "The preceding period does not have complete measurement coverage.",
    )
  },
}

function SelectionHarness({
  reporting = clinicDashboardReportingFixture,
  ...args
}: React.ComponentProps<typeof DashboardOverviewScreen> & { reporting?: ClinicDashboardReporting }) {
  const controller = useDashboardOverviewController({
    initialReporting: { status: "ready", reporting },
    profileProgress: args.model.profileProgress,
    clinicPreview: args.model.clinicPreview,
    loadReporting: async (days) => ({
      ...reporting,
      period: { ...reporting.period, days },
    }),
  })
  return (
    <div className="space-y-4">
      <ReportingPeriodControl
        value={controller.model.periodDays}
        onValueChange={controller.actions.changePeriodDays}
      />
      <DashboardOverviewScreen
        {...args}
        model={controller.model}
        onMetricSelect={controller.actions.selectMetric}
      />
    </div>
  )
}

export const MetricSelection: Story = {
  render: (args) => <SelectionHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Inquiries 7/ }))
    await expect(canvas.getByRole("heading", { level: 2, name: "Inquiries" })).toBeVisible()
    const inquiries = canvas.getByRole("button", { name: /Inquiries 7/ })
    inquiries.focus()
    await userEvent.keyboard("{Enter}")
    await expect(inquiries).toHaveFocus()
    await userEvent.click(canvas.getByRole("button", { name: "About Inquiries details" }))
    const explanation = within(document.body).getByRole("dialog", { name: "About Inquiries details" })
    await expect(explanation).toHaveTextContent("excluding spam")
    await expect(explanation).toHaveTextContent("Stored inquiries created in the selected period")
    await expect(explanation).toHaveTextContent("not an inventory of open work")
    await expect(explanation.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    await waitFor(() => {
      expect(explanation.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
      expect(explanation.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
    })
    await userEvent.keyboard("{Escape}")
    await expect(canvas.getByRole("button", { name: "About Inquiries details" })).toHaveFocus()
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(canvas.getByRole("button", { name: /Inquiries 7/ })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("heading", { name: "Conversion funnel (7 days)" })).toBeVisible()
  },
}

export const UniqueVisitors: Story = {
  render: (args) => <SelectionHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const visitors = canvas.getByRole("button", { name: /Unique visitors 200/ })
    visitors.focus()
    await userEvent.keyboard("{Enter}")
    await expect(visitors).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("heading", { level: 2, name: "Unique visitors" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "About Unique visitors details" }))
    const dialog = within(document.body).getByRole("dialog", { name: "About Unique visitors details" })
    await expect(dialog).toHaveTextContent("Browser or device changes and cleared storage")
    await expect(dialog).toHaveTextContent("consent-based browser recognition")
    await expect(dialog.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    await expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
    await userEvent.keyboard("{Escape}")
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(canvas.getByRole("button", { name: /Unique visitors 200/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
export const UniqueVisitors390: Story = {
  ...UniqueVisitors,
  globals: { viewport: { value: "mobile390Tall" } },
}
export const UniqueVisitors320: Story = {
  ...UniqueVisitors,
  globals: { viewport: { value: "mobile320Short" } },
}
export const UniqueVisitorsDark: Story = { ...UniqueVisitors, globals: { theme: "dark" } }
export const UniqueVisitorsDark390: Story = {
  ...UniqueVisitors,
  globals: { theme: "dark", viewport: { value: "mobile390Tall" } },
}
export const UniqueVisitorsDark320: Story = {
  ...UniqueVisitors,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}

const impressionsReporting: ClinicDashboardReporting = {
  ...clinicDashboardReportingFixture,
  metrics: {
    ...clinicDashboardReportingFixture.metrics,
    impressions: {
      source: "posthog",
      current: { state: "available", value: 600 },
      comparison: { state: "available", value: 500, absoluteDelta: 100, relativeDeltaPercent: 20 },
    },
  },
}

export const Impressions: Story = {
  render: (args) => <SelectionHarness {...args} reporting={impressionsReporting} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const impressions = canvas.getByRole("button", { name: "Impressions 600" })
    impressions.focus()
    await userEvent.keyboard("{Enter}")
    await expect(impressions).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("heading", { level: 2, name: "Impressions" })).toBeVisible()
    await expect(canvas.getByText("+20% compared with the previous period")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "About Impressions details" }))
    const dialog = within(document.body).getByRole("dialog", { name: "About Impressions details" })
    await expect(dialog).toHaveTextContent("active browser window")
    await expect(dialog).toHaveTextContent("once per result view")
    await expect(dialog).toHaveTextContent("No minimum duration or percentage")
    await expect(dialog).toHaveTextContent("Arrows show order, not conversion rates")
    await expect(dialog.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    await expect(dialog.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight)
    await userEvent.keyboard("{Escape}")
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(impressions).toHaveAttribute("aria-pressed", "true")
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
export const Impressions390: Story = { ...Impressions, globals: { viewport: { value: "mobile390Tall" } } }
export const Impressions320: Story = { ...Impressions, globals: { viewport: { value: "mobile320Short" } } }
export const ImpressionsDark: Story = { ...Impressions, globals: { theme: "dark" } }
export const ImpressionsDark390: Story = {
  ...Impressions,
  globals: { theme: "dark", viewport: { value: "mobile390Tall" } },
}
export const ImpressionsDark320: Story = {
  ...Impressions,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}

export const ImpressionsPartialCoverage: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: previewFixture,
      selectedMetricId: "impressions",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 2, name: "Impressions" })).toBeVisible()
    await expect(canvas.getByText("Incomplete data coverage")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Impressions Not available" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  },
}

export const DetailInformationWithoutSelection: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "About Profile views details" }))
    const dialog = within(document.body).getByRole("dialog", { name: "About Profile views details" })
    await expect(dialog).toHaveTextContent("Analytics include only visitors with consent")
    await expect(args.onMetricSelect).not.toHaveBeenCalled()
    await expect(canvas.getByRole("heading", { level: 2, name: "Profile views" })).toBeVisible()
  },
}

export const LoadingReporting: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "loading" },
      periodDays: 7,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("list", { name: "Profile tasks" })).toBeVisible()
    await expect(canvas.getAllByText("Loading").length).toBeGreaterThan(0)
    await expect(canvas.queryByText("284")).not.toBeInTheDocument()
  },
}

export const ReportingUnavailable: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "temporarily-unavailable" },
      periodDays: 90,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("list", { name: "Profile tasks" })).toBeVisible()
    await expect(canvas.getByText("Public clinic preview")).toBeVisible()
    await expect(canvas.queryByText("284")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Retry reporting" }))
    await expect(args.onReportingRetry).toHaveBeenCalledOnce()
  },
}

export const ProfileUnavailable: Story = {
  globals: { viewport: { value: "desktop1440" } },
  args: {
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressError,
      clinicPreview: { status: "unavailable", name: "Controlled clinic" },
      selectedMetricId: "profileViews",
    }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("list", { name: "Profile tasks" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("heading", { name: "Profile progress unavailable" })).toBeVisible()
    await expect(canvas.getAllByText("284").length).toBeGreaterThan(0)
    const metrics = within(canvas.getByRole("region", { name: "Dashboard metrics" }))
    await expect(metrics.getByText("Not available", { exact: true })).toBeVisible()
    await expect(metrics.getByRole("button", { name: "Open inquiries" })).toBeVisible()
    await expect(metrics.getByRole("button", { name: "Reviews to answer" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(args.onProfileProgressRetry).toHaveBeenCalledOnce()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

export const NarrowViewport: Story = {
  ...Available,
  globals: { viewport: { value: "mobile320Short" } },
  play: async (context) => {
    await exerciseAvailable(context)
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

export const DesktopLayout: Story = {
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ canvasElement }) => {
    const profile = canvasElement.querySelector("[data-dashboard-profile-progress]")!.getBoundingClientRect()
    const panel = canvasElement.querySelector("[data-dashboard-metric-panel]")!.getBoundingClientRect()
    const summary = canvasElement.querySelector("[data-dashboard-summary-column]")!.getBoundingClientRect()
    await expect(Math.abs(profile.top - panel.top)).toBeLessThanOrEqual(1)
    await expect(Math.abs(summary.top - panel.top)).toBeLessThanOrEqual(1)
    await expect(panel.width / profile.width).toBeGreaterThanOrEqual(2)
    await expect(panel.width / summary.width).toBeGreaterThanOrEqual(2)
  },
}

export const DarkOverview: Story = { ...Available, globals: { theme: "dark" } }
export const DraftTasks: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressDraft,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
}
export const PublishTasks: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingFixture },
      periodDays: 30,
      profileProgress: dashboardProfileProgressPublishReady,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
}

export const PartialCoverage: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingWithPartialCoverage },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Incomplete data coverage")).toBeVisible()
    await expect(canvas.queryByText("284", { exact: true })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Open inquiries" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Reviews to answer" })).toBeVisible()
  },
}
export const AnalyticsUnavailable: Story = {
  args: {
    model: createDashboardOverview({
      reporting: { status: "ready", reporting: clinicDashboardReportingWithSourceUnavailable },
      periodDays: 30,
      profileProgress: dashboardProfileProgressReady,
      clinicPreview: previewFixture,
      selectedMetricId: "profileViews",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Data source unavailable")).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Inquiries 7/ })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Open inquiries" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Reviews to answer" })).toBeVisible()
  },
}

export const TopKpiDark1440: Story = {
  ...TopKpiScope,
  globals: { theme: "dark", viewport: { value: "desktop1440" } },
}
export const TopKpi390: Story = { ...TopKpiScope, globals: { viewport: { value: "mobile390Tall" } } }
export const TopKpiDark390: Story = {
  ...TopKpiScope,
  globals: { theme: "dark", viewport: { value: "mobile390Tall" } },
}
export const TopKpi320: Story = { ...TopKpiScope, globals: { viewport: { value: "mobile320Short" } } }
export const TopKpiDark320: Story = {
  ...TopKpiScope,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}
export const ProfileUnavailableDark1440: Story = {
  ...ProfileUnavailable,
  globals: { theme: "dark", viewport: { value: "desktop1440" } },
}
export const ProfileUnavailable390: Story = {
  ...ProfileUnavailable,
  globals: { viewport: { value: "mobile390Tall" } },
}
export const ProfileUnavailableDark390: Story = {
  ...ProfileUnavailable,
  globals: { theme: "dark", viewport: { value: "mobile390Tall" } },
}
export const ProfileUnavailable320: Story = {
  ...ProfileUnavailable,
  globals: { viewport: { value: "mobile320Short" } },
}
export const ProfileUnavailableDark320: Story = {
  ...ProfileUnavailable,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}

export const TopKpiTablet768: Story = {
  ...TopKpiScope,
  globals: { viewport: { value: "tablet768" } },
}
export const TopKpiDark768: Story = {
  ...TopKpiScope,
  globals: { theme: "dark", viewport: { value: "tablet768" } },
}
export const TopKpiTablet1279: Story = {
  ...TopKpiScope,
  globals: { viewport: { value: "desktop1279" } },
}
export const TopKpiDesktop1280: Story = {
  ...TopKpiScope,
  globals: { viewport: { value: "desktop1280" } },
}
