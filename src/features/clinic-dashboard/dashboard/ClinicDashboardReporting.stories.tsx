import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { clinicDashboardReportingFixture } from "./testing/clinic-dashboard-reporting.fixtures"
import { ClinicDashboardReportingController } from "./ClinicDashboardReporting"

const meta = {
  args: {
    initialReporting: { reporting: clinicDashboardReportingFixture, status: "ready" },
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

    await expect(canvas.getByRole("heading", { level: 1, name: "Reporting" })).toBeVisible()
    await expect(canvas.getByText("284", { exact: true })).toBeVisible()
  },
}
