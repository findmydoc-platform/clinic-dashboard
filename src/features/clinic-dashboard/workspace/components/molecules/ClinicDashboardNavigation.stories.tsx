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

export const SubscriptionsSelection: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
    await userEvent.click(canvas.getByRole("button", { name: "Subscriptions" }))
    await expect(args.onSectionSelect).toHaveBeenCalledWith("subscriptions")
  },
}

export const CertificatesAndAccreditationsAt320: Story = {
  args: { activeSection: "certificates-accreditations" },
  globals: { viewport: { value: "mobile320Short" } },
  render: (args) => (
    <div className="w-58">
      <ClinicDashboardNavigation {...args} />
    </div>
  ),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const destination = canvas.getByRole("button", { name: "Credentials" })
    const label = within(destination).getByText("Credentials")

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(destination.scrollWidth).toBeLessThanOrEqual(destination.clientWidth)
    await expect(destination.scrollHeight).toBeLessThanOrEqual(destination.clientHeight)
    await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    await expect(label).toBeVisible()

    await userEvent.click(destination)
    await expect(args.onSectionSelect).toHaveBeenCalledWith("certificates-accreditations")
  },
}
