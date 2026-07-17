import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { DashboardScreen } from "./DashboardScreen"

const meta = {
  component: DashboardScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Screen",
} satisfies Meta<typeof DashboardScreen>

export default meta
type Story = StoryObj<typeof meta>

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
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
