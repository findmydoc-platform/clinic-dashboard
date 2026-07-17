import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ClinicDashboardWorkspace } from "@/features/clinic-dashboard/public"

const meta = {
  component: ClinicDashboardWorkspace,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Foundation Preview",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const PresentationDashboard: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Review images" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Review team" })).toBeInTheDocument()
    await expect(canvas.queryByRole("group", { name: "Reporting period" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()
  },
}

export const FullInterfaceNavigationAndReporting: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(canvas.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByText("+10.1% vs. previous 7 days")).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Notifications, 2 new notifications" }),
    ).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Messages" }))
    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await expect(canvas.getByRole("searchbox", { name: "Search conversations" })).toBeInTheDocument()
  },
}

export const ProfileTaskToProfileDestination: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Review images" }))
    const taskDialog = canvas.getByRole("dialog", { name: "Missing images" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Open image gallery" }))

    await expect(await canvas.findByRole("heading", { level: 1, name: "Clinic profile" })).toBeInTheDocument()
    const gallery = canvas.getByRole("region", { name: "Clinic image gallery" })
    await waitFor(() => expect(gallery).toHaveFocus())
  },
}

export const PresentationProfileManagementPreview: Story = {
  args: { initialSection: "profile", prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toBeDisabled()
    await expect(canvas.getByRole("button", { name: "Add team member" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "New treatment" }))

    const dialog = canvas.getByRole("dialog", { name: "Create new treatment" })
    await expect(within(dialog).getByRole("textbox", { name: "Treatment name" })).toBeDisabled()
    await expect(within(dialog).queryByRole("button", { name: "Save treatment" })).not.toBeInTheDocument()
  },
}

export const InterfaceModeUnlocksManagement: Story = {
  args: { prototypeMode: "presentation", showPrototypeModeToggle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const modeSwitch = canvas.getByRole("switch", { name: "Full interface" })

    await expect(modeSwitch).not.toBeChecked()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).toBeChecked()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Export" })).toBeInTheDocument()
  },
}

export const MobileNavigation: Story = {
  args: { initialSection: "messages", prototypeMode: "visual-reference" },
  parameters: {
    viewport: { defaultViewport: "mobile390Tall" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    const navigation = canvas.getByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(within(navigation).getByRole("button", { name: "Clinic profile" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Clinic profile" })).toBeInTheDocument()

    const navigationTrigger = canvas.getByRole("button", { name: "Open navigation" })
    await userEvent.click(navigationTrigger)
    await userEvent.click(
      within(canvas.getByRole("dialog", { name: "Clinic navigation" })).getByRole("button", {
        name: "Contact support",
      }),
    )
    const supportDialog = await canvas.findByRole("dialog", { name: "Contact support" })
    await userEvent.click(within(supportDialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(navigationTrigger).toHaveFocus())
  },
}
