import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
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

const previewFixture = {
  status: "available",
  name: "Controlled Bosphorus Clinic",
  location: "Istanbul, Türkiye",
  imageStatus: "empty",
} as const

const meta = {
  component: DashboardOverviewScreen,
  args: {
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
  await expect(metrics.getByText("284", { exact: true })).toBeVisible()
  await expect(metrics.getAllByText("Not supported yet")).toHaveLength(2)
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
  ).toHaveLength(5)
  await expect(canvas.getByRole("button", { name: /Impressions Not supported yet/ })).toBeVisible()
  await expect(canvas.queryByRole("button", { name: /Download/ })).not.toBeInTheDocument()
}

export const Available: Story = { play: exerciseAvailable }

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
    const metrics = within(canvasElement).getByRole("region", { name: "Dashboard metrics" })
    const canvas = within(metrics)
    const page = within(document.body)
    await expect(canvas.getByText("284", { exact: true })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "About Profile views" }))
    await expect(page.getByRole("dialog", { name: "About Profile views" })).toHaveTextContent(
      "The preceding period does not have complete measurement coverage.",
    )
  },
}

function SelectionHarness(args: React.ComponentProps<typeof DashboardOverviewScreen>) {
  const controller = useDashboardOverviewController({
    initialReporting: { status: "ready", reporting: clinicDashboardReportingFixture },
    profileProgress: args.model.profileProgress,
    clinicPreview: args.model.clinicPreview,
    loadReporting: async (days) => ({
      ...clinicDashboardReportingFixture,
      period: { ...clinicDashboardReportingFixture.period, days },
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
    await userEvent.click(canvas.getByRole("button", { name: /Contacts Not supported yet/ }))
    await expect(canvas.getByRole("heading", { level: 2, name: "Contacts" })).toBeVisible()
    await expect(canvas.getByRole("status")).toHaveTextContent("Chat conversations are not measured")
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(canvas.getByRole("button", { name: /Contacts Not supported yet/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(canvas.getByRole("heading", { name: "Conversion funnel (7 days)" })).toBeVisible()
  },
}

export const KpiInformationWithoutSelection: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "About Contacts" }))
    const dialog = within(document.body).getByRole("dialog", { name: "About Contacts" })
    await expect(dialog).toHaveTextContent("Chat conversations are not measured")
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
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(args.onProfileProgressRetry).toHaveBeenCalledOnce()
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
    const metrics = within(within(canvasElement).getByRole("region", { name: "Dashboard metrics" }))
    await expect(metrics.getByText("Incomplete data coverage")).toBeVisible()
    await expect(metrics.queryByText("284", { exact: true })).not.toBeInTheDocument()
    await expect(metrics.getAllByText("Not supported yet")).toHaveLength(2)
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
    const metrics = within(within(canvasElement).getByRole("region", { name: "Dashboard metrics" }))
    await expect(metrics.getByText("Data source unavailable")).toBeVisible()
    await expect(metrics.getByText("7", { exact: true })).toBeVisible()
    await expect(metrics.getAllByText("Not supported yet")).toHaveLength(2)
  },
}
