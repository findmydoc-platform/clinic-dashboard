import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { clinicDashboardReportingFixture } from "./testing/clinic-dashboard-reporting.fixtures"
import { ClinicDashboardReportingController } from "./ClinicDashboardReporting"
import { dashboardProfileProgressReady } from "./testing/dashboard.fixtures"

const meta = {
  args: {
    initialReporting: { reporting: clinicDashboardReportingFixture, status: "ready" },
    profileProgress: dashboardProfileProgressReady,
    clinicPreview: { status: "unavailable", name: "Controlled clinic" },
    onProfileTaskOpen: fn(),
    onProfileProgressRetry: fn(),
    onReviewsOpen: fn(),
  },
  component: ClinicDashboardReportingController,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Organisms/Clinic Dashboard Reporting",
} satisfies Meta<typeof ClinicDashboardReportingController>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
    await expect(
      within(canvas.getByRole("region", { name: "Dashboard metrics" })).getByText("284", { exact: true }),
    ).toBeVisible()
  },
}
