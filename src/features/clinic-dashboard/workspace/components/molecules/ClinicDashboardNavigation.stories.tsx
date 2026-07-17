import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ClinicDashboardNavigation } from "./ClinicDashboardNavigation"
import { clinicDashboardNavigationItems } from "../../navigation"

const meta = {
  args: {
    activeSection: "dashboard",
    items: clinicDashboardNavigationItems,
    onSectionSelect: fn(),
  },
  component: ClinicDashboardNavigation,
  tags: ["domain:workspace", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Molecules/Clinic Dashboard Navigation",
} satisfies Meta<typeof ClinicDashboardNavigation>

export default meta
type Story = StoryObj<typeof meta>

export const DashboardActive: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
    await userEvent.click(canvas.getByRole("button", { name: "Messages" }))
    await expect(args.onSectionSelect).toHaveBeenCalledWith("messages")
  },
}
