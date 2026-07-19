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

function getMetricPanelLayout(canvasElement: HTMLElement) {
  const chart = canvasElement.querySelector<SVGElement>("svg[role='group']")
  const summaryItems = Array.from(
    canvasElement.querySelectorAll<HTMLElement>("[data-dashboard-summary-item]"),
  )

  if (!chart || summaryItems.length !== 5) {
    throw new Error("Expected the dashboard metric chart and five summary items")
  }

  return { chart, summaryItems }
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

    const columnBottoms = columns.map((column) => column.bottom)
    const { chart, summaryItems } = getMetricPanelLayout(canvasElement)

    await expect(getComputedStyle(grid).alignItems).toBe("stretch")
    await expect(Math.abs(chartColumn.top - leftColumn.top)).toBeLessThanOrEqual(0.5)
    await expect(Math.abs(rightColumn.top - leftColumn.top)).toBeLessThanOrEqual(0.5)
    await expect(Math.max(...columnBottoms) - Math.min(...columnBottoms)).toBeLessThanOrEqual(0.5)
    await expect(chartColumn.width / leftColumn.width).toBeGreaterThanOrEqual(2)
    await expect(chartColumn.width / rightColumn.width).toBeGreaterThanOrEqual(2)
    await expect(chart.getBoundingClientRect().height).toBeGreaterThanOrEqual(415.5)

    for (const summaryItem of summaryItems) {
      const styles = getComputedStyle(summaryItem)

      await expect(styles.alignItems).toBe("center")
      await expect(styles.justifyContent).toBe("center")
      await expect(styles.textAlign).toBe("center")
    }
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
    const chartViewport = canvasElement.querySelector<HTMLElement>("[data-chart-viewport]")
    const pointHitTarget = canvasElement.querySelector<SVGRectElement>("[data-chart-point-hit-target]")

    if (!chartViewport || !pointHitTarget) throw new Error("Expected the dashboard chart viewport")

    await expect(
      within(canvasElement).queryByText("Swipe or scroll to view every date."),
    ).not.toBeInTheDocument()
    await expect(chartViewport.scrollWidth).toBeLessThanOrEqual(chartViewport.clientWidth)
    await expect(pointHitTarget.getBoundingClientRect().height).toBeGreaterThanOrEqual(415.5)
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const FunnelControlsChart: Story = {
  args: FullCapabilities.args,
  render: (args) => <MetricSelectionHarness {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const metricCards = within(canvas.getByRole("region", { name: "Dashboard metrics" }))
    const funnel = within(canvas.getByRole("list", { name: "Conversion stages" }))
    const profileViewsButton = funnel.getByRole("button", { name: "Profile views 848" })

    await expect(metricCards.queryAllByRole("button")).toHaveLength(0)
    await expect(metricCards.getByText("Profile completion").closest("button")).toBeNull()
    await expect(metricCards.getByText("Profile views").closest("button")).toBeNull()
    await expect(profileViewsButton).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("heading", { level: 2, name: "Profile views over time" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Download profile views" })).toBeVisible()

    await userEvent.click(funnel.getByRole("button", { name: "Impressions 4,680" }))
    await expect(args.actions.onMetricSelect).toHaveBeenLastCalledWith("impressions")
    await expect(canvas.getByRole("heading", { level: 2, name: "Impressions over time" })).toBeVisible()
    await expect(canvas.getByLabelText("Impressions, selected metric")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()

    await userEvent.click(funnel.getByRole("button", { name: "Unique visitors 543" }))
    await expect(args.actions.onMetricSelect).toHaveBeenLastCalledWith("uniqueVisitors")
    await expect(canvas.getByRole("heading", { level: 2, name: "Unique visitors over time" })).toBeVisible()
    await expect(canvas.getAllByText("64.0% of profile views")).toHaveLength(1)

    await userEvent.hover(
      funnel.getByRole("button", {
        name: "Show conversion from Profile views to Unique visitors",
      }),
    )
    await expect(canvas.getByRole("tooltip")).toHaveTextContent("64.0% of profile views")
    await expect(canvas.getAllByText("64.0% of profile views")).toHaveLength(2)

    const contactsButton = funnel.getByRole("button", { name: "Contacts 12" })
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

export const DarkFunnelSelection: Story = {
  ...FunnelControlsChart,
  globals: { theme: "dark" },
}
