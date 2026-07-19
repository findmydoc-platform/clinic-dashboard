import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ClinicDashboardWorkspaceHarness } from "@/features/clinic-dashboard/workspace/testing/public"

const meta = {
  component: ClinicDashboardWorkspaceHarness,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Foundation Preview",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>

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

export const PresentationHidesSupport: Story = {
  args: { prototypeMode: "presentation" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole("button", { name: "Contact support" })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))

    const navigation = await canvas.findByRole("dialog", { name: "Clinic navigation" })
    await expect(
      within(navigation).queryByRole("button", { name: "Contact support" }),
    ).not.toBeInTheDocument()
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
  args: {
    prototypeMode: "presentation",
    start: { section: "profile" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Clinic workspace · Profile overview")).toBeInTheDocument()
    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: "Add team member" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "New treatment" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("dialog", { name: "Add treatment" })).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "View all images" }))
    const galleryDialog = canvas.getByRole("dialog", { name: "Clinic image gallery" })
    await expect(within(galleryDialog).getByText("Cover image")).toBeInTheDocument()
    await expect(within(galleryDialog).queryByRole("button", { name: "Set cover" })).not.toBeInTheDocument()
    await userEvent.click(within(galleryDialog).getByRole("button", { name: "Close gallery" }))
    await waitFor(() =>
      expect(canvas.queryByRole("dialog", { name: "Clinic image gallery" })).not.toBeInTheDocument(),
    )

    await userEvent.click(canvas.getByRole("button", { name: "View Dr Markus Weber" }))
    const teamDialog = canvas.getByRole("dialog", { name: "Team member details" })
    await expect(within(teamDialog).getByRole("textbox", { name: "First name" })).toBeDisabled()
    await expect(
      within(teamDialog).queryByRole("button", { name: /Save team member/ }),
    ).not.toBeInTheDocument()
    await userEvent.click(within(teamDialog).getByRole("button", { name: "Done" }))
    await waitFor(() =>
      expect(canvas.queryByRole("dialog", { name: "Team member details" })).not.toBeInTheDocument(),
    )

    await userEvent.click(canvas.getByRole("button", { name: "View Laser teeth whitening" }))
    const treatmentDialog = canvas.getByRole("dialog", { name: "Treatment details" })
    await expect(within(treatmentDialog).getByRole("textbox", { name: "Treatment" })).toHaveAttribute(
      "readonly",
    )
    await expect(within(treatmentDialog).getByRole("textbox", { name: "Price" })).toHaveAttribute("readonly")
    await expect(within(treatmentDialog).queryByRole("button", { name: /Save/ })).not.toBeInTheDocument()
    await userEvent.click(within(treatmentDialog).getByRole("button", { name: "Done" }))
    await waitFor(() =>
      expect(canvas.queryByRole("dialog", { name: "Treatment details" })).not.toBeInTheDocument(),
    )
  },
}

export const MissingTreatmentOpensLocalSupport: Story = {
  args: { prototypeMode: "visual-reference", start: { section: "profile" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "New treatment" }))
    const treatmentDialog = canvas.getByRole("dialog", { name: "Add treatment" })
    await userEvent.click(within(treatmentDialog).getByRole("button", { name: "Treatment missing?" }))

    await waitFor(() =>
      expect(canvas.queryByRole("dialog", { name: "Add treatment" })).not.toBeInTheDocument(),
    )
    const supportDialog = await canvas.findByRole("dialog", { name: "Contact support" })
    await expect(
      within(supportDialog).getByText("Complete this local demo form. Nothing will be sent."),
    ).toBeInTheDocument()
    await expect(within(supportDialog).getByRole("heading", { name: "Support request" })).toBeInTheDocument()
  },
}

export const InterfaceModeUnlocksManagement: Story = {
  args: { prototypeMode: "presentation", showPrototypeModeToggle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const modeSwitch = canvas.getByRole("switch", { name: "Demo scope" })

    await expect(modeSwitch).not.toBeChecked()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).toBeChecked()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /export/i })).not.toBeInTheDocument()
  },
}

export const MobileNavigation: Story = {
  args: { prototypeMode: "visual-reference", start: { section: "messages" } },
  parameters: {
    viewport: { defaultViewport: "mobile390Tall" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    const navigation = await canvas.findByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(within(navigation).getByRole("button", { name: "Clinic profile" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Clinic profile" })).toBeInTheDocument()

    const navigationTrigger = canvas.getByRole("button", { name: "Open navigation" })
    await userEvent.click(navigationTrigger)
    const reopenedNavigation = await canvas.findByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(
      within(reopenedNavigation).getByRole("button", {
        name: "Contact support",
      }),
    )
    const supportDialog = await canvas.findByRole("dialog", { name: "Contact support" })
    await userEvent.click(within(supportDialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(navigationTrigger).toHaveFocus())
  },
}
