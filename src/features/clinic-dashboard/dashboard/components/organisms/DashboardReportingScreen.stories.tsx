import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import {
  clinicDashboardReportingFixture,
  clinicDashboardReportingWithPartialCoverage,
  clinicDashboardReportingWithSourceUnavailable,
} from "../../testing/clinic-dashboard-reporting.fixtures"
import { DashboardReportingScreen } from "./DashboardReportingScreen"

const meta = {
  args: {
    model: { periodDays: 30, reporting: clinicDashboardReportingFixture, status: "ready" },
    onPeriodChange: fn(),
  },
  component: DashboardReportingScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Reporting Screen",
} satisfies Meta<typeof DashboardReportingScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Reporting" })).toBeVisible()
    await expect(canvas.getByRole("region", { name: "Reporting metrics" })).toBeVisible()
    await expect(canvas.getByText("Europe/Istanbul")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(args.onPeriodChange).toHaveBeenCalledWith(7)
  },
}

export const SourceUnavailable: Story = {
  args: {
    model: { periodDays: 30, reporting: clinicDashboardReportingWithSourceUnavailable, status: "ready" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const metrics = within(canvas.getByRole("region", { name: "Reporting metrics" }))

    await expect(metrics.getByText("Profile views")).toBeVisible()
    await expect(metrics.getByText("Data source unavailable")).toBeVisible()
    await expect(metrics.getByText("Not available")).toBeVisible()
  },
}

export const PartialCoverage: Story = {
  args: {
    model: { periodDays: 30, reporting: clinicDashboardReportingWithPartialCoverage, status: "ready" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const metrics = within(canvas.getByRole("region", { name: "Reporting metrics" }))

    await expect(metrics.getByText("CTA interactions")).toBeVisible()
    await expect(metrics.getByText("Incomplete data coverage")).toBeVisible()
    await expect(metrics.getByText("Not available")).toBeVisible()
  },
}

export const TemporarilyUnavailable: Story = {
  args: { model: { periodDays: 90, status: "temporarily-unavailable" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("alert")).toHaveTextContent("No reporting values are shown")
    await expect(canvas.queryByRole("region", { name: "Reporting metrics" })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Retry reporting" }))
    await expect(args.onPeriodChange).toHaveBeenCalledWith(90)
  },
}
