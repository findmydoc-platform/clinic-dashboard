import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { DashboardPeriodControl } from "@/components/molecules/DashboardPeriodControl"
import type { DashboardReportingPeriod } from "@/lib/clinic-dashboard/reporting"

const meta = {
  component: DashboardPeriodControl,
  parameters: {
    layout: "centered",
    viewport: {
      options: {
        mobile320Short: { name: "Mobile 320 short", styles: { height: "700px", width: "320px" } },
      },
    },
  },
  tags: ["autodocs", "layer:molecule", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Molecules/Dashboard Period Control",
} satisfies Meta<typeof DashboardPeriodControl>

export default meta
type Story = StoryObj<typeof meta>

function StatefulDashboardPeriodControl({ initialPeriod }: { initialPeriod: DashboardReportingPeriod }) {
  const [period, setPeriod] = useState(initialPeriod)

  return <DashboardPeriodControl onChange={setPeriod} period={period} />
}

export const Interactive: Story = {
  args: { onChange: () => undefined, period: "30 days" },
  render: () => <StatefulDashboardPeriodControl initialPeriod="30 days" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const thirtyDays = canvas.getByRole("button", { name: "30 days" })
    const ninetyDays = canvas.getByRole("button", { name: "90 days" })

    await expect(thirtyDays).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(ninetyDays)
    await expect(ninetyDays).toHaveAttribute("aria-pressed", "true")
    await expect(thirtyDays).toHaveAttribute("aria-pressed", "false")
  },
}

export const MobileTouchTargets: Story = {
  args: { onChange: () => undefined, period: "7 days" },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const period of ["7 days", "30 days", "90 days"]) {
      const button = canvas.getByRole("button", { name: period })
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    }
  },
}
