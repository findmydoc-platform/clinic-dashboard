import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { DashboardPeriodControl } from "../molecules/DashboardPeriodControl"
import { createDashboardMetricSelection } from "../../model/dashboard-metric-selection"
import type { DashboardSelectableMetricId } from "../../model/reporting"
import { dashboardFixture, dashboardViewModel } from "../../testing/dashboard.fixtures"
import { DashboardScreen } from "./DashboardScreen"

const meta = {
  component: DashboardScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Screen",
} satisfies Meta<typeof DashboardScreen>

export default meta
type Story = StoryObj<typeof meta>

function MetricSelectionHarness(args: Story["args"]) {
  const [period, setPeriod] = useState(args.model.reporting.period)
  const [selectedMetricId, setSelectedMetricId] = useState<DashboardSelectableMetricId>(
    args.model.selectedMetric.id,
  )
  const reporting = dashboardFixture.reporting[period]

  return (
    <div className="space-y-4">
      <DashboardPeriodControl onValueChange={setPeriod} value={period} />
      <DashboardScreen
        {...args}
        actions={{
          ...args.actions,
          onMetricSelect: (metricId) => {
            args.actions.onMetricSelect(metricId)
            setSelectedMetricId(metricId)
          },
        }}
        model={{
          ...args.model,
          reporting,
          selectedMetric: createDashboardMetricSelection(reporting, selectedMetricId),
        }}
      />
    </div>
  )
}

async function expectFullCapabilities(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
  await expect(canvas.getByRole("button", { name: "Download profile views" })).toBeInTheDocument()
  await expect(
    canvas.getByRole("button", { name: "View details for Certificates required" }),
  ).toBeInTheDocument()
  await expect(canvas.getByRole("region", { name: "Dashboard clinic location summary" })).toBeInTheDocument()
}

async function expectPresentationCapabilities(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await expect(canvas.getByRole("button", { name: "Review images" })).toBeInTheDocument()
  await expect(canvas.queryByRole("button", { name: /^View details/ })).not.toBeInTheDocument()
  await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()
  await expect(canvas.queryByRole("button", { name: "Open preview" })).not.toBeInTheDocument()
}

function getLowerDashboardColumns(canvasElement: HTMLElement) {
  const grid = canvasElement.querySelector<HTMLElement>("[data-dashboard-lower-grid]")

  if (!grid || grid.children.length !== 3) {
    throw new Error("Expected the three-column lower dashboard grid")
  }

  return {
    columns: Array.from(grid.children, (child) => child.getBoundingClientRect()),
    grid,
  }
}

export const FullCapabilities: Story = {
  args: {
    actions: {
      onMetricSelect: fn(),
      onProfileTaskOpen: fn(),
      onProfileViewsDownload: fn(),
      onReviewsOpen: fn(),
    },
    canDownloadProfileViews: true,
    model: dashboardViewModel,
    showCertificateTasks: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Review images" }))
    await expect(args.actions.onProfileTaskOpen).toHaveBeenCalledWith(dashboardViewModel.profileTasks[0])
    await userEvent.click(canvas.getByRole("button", { name: "Download profile views" }))
    await expect(args.actions.onProfileViewsDownload).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole("button", { name: "View reviews" }))
    await expect(args.actions.onReviewsOpen).toHaveBeenCalledOnce()
  },
}

export const PresentationCapabilities: Story = {
  args: {
    actions: {
      onMetricSelect: fn(),
      onProfileTaskOpen: fn(),
      onProfileViewsDownload: fn(),
      onReviewsOpen: fn(),
    },
    canDownloadProfileViews: false,
    model: dashboardViewModel,
    showCertificateTasks: false,
  },
  play: async ({ canvasElement }) => {
    await expectPresentationCapabilities(canvasElement)
  },
}

export const Desktop1440Layout: Story = {
  args: FullCapabilities.args,
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ canvasElement }) => {
    await expectFullCapabilities(canvasElement)

    const { columns, grid } = getLowerDashboardColumns(canvasElement)
    const [leftColumn, chartColumn, rightColumn] = columns

    await expect(getComputedStyle(grid).alignItems).toBe("flex-start")
    await expect(Math.abs(chartColumn.top - leftColumn.top)).toBeLessThanOrEqual(0.5)
    await expect(Math.abs(rightColumn.top - leftColumn.top)).toBeLessThanOrEqual(0.5)
    await expect(chartColumn.width / leftColumn.width).toBeGreaterThanOrEqual(2)
    await expect(chartColumn.width / rightColumn.width).toBeGreaterThanOrEqual(2)
  },
}

export const NarrowViewport: Story = {
  args: FullCapabilities.args,
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    await expectFullCapabilities(canvasElement)

    const { columns, grid } = getLowerDashboardColumns(canvasElement)
    const [profileColumn, chartColumn, summaryColumn] = columns

    await expect(chartColumn.top).toBeGreaterThan(profileColumn.bottom)
    await expect(summaryColumn.top).toBeGreaterThan(chartColumn.bottom)
    await expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth)
    const chartScroll = canvasElement.querySelector<HTMLElement>("[data-chart-scroll]")
    const pointHitTarget = canvasElement.querySelector<SVGCircleElement>("[data-chart-point-hit-target]")

    if (!chartScroll || !pointHitTarget) throw new Error("Expected the dashboard chart scroll surface")

    await expect(within(canvasElement).getByText("Swipe or scroll to view every date.")).toBeVisible()
    await expect(chartScroll.scrollWidth).toBeGreaterThan(chartScroll.clientWidth)
    await expect(pointHitTarget.getBoundingClientRect().width).toBeGreaterThanOrEqual(44)
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const SelectableMetrics: Story = {
  args: FullCapabilities.args,
  render: (args) => <MetricSelectionHarness {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const completionText = canvas.getByText("Profile completion")
    const profileViewsButton = canvas.getByRole("button", { name: /^Profile views\b/i })

    await expect(completionText.closest("button")).toBeNull()
    await expect(profileViewsButton).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("heading", { level: 2, name: "Profile views over time" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Download profile views" })).toBeVisible()

    await userEvent.click(canvas.getByRole("button", { name: /^Impressions\b/i }))
    await expect(args.actions.onMetricSelect).toHaveBeenLastCalledWith("impressions")
    await expect(canvas.getByRole("heading", { level: 2, name: "Impressions over time" })).toBeVisible()
    await expect(canvas.getByLabelText("Impressions, selected metric")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()

    const contactsButton = canvas.getByRole("button", { name: /^Contacts\b/i })
    contactsButton.focus()
    await expect(contactsButton).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(args.actions.onMetricSelect).toHaveBeenLastCalledWith("contacts")
    await expect(canvas.getByRole("heading", { level: 2, name: "Contacts over time" })).toBeVisible()

    await userEvent.click(canvas.getByRole("button", { name: "30 days" }))
    await expect(contactsButton).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByText("-2.1% vs. previous 30 days")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "90 days" }))
    await expect(contactsButton).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByText("+4.4% vs. previous 90 days")).toBeVisible()
  },
}

export const DarkMetricSelection: Story = {
  ...SelectableMetrics,
  globals: { theme: "dark" },
}
