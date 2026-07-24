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
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Download profile views" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Notifications, 2 new notifications" }),
    ).toBeInTheDocument()
    await expect(canvas.queryByRole("switch", { name: "Demo scope" })).not.toBeInTheDocument()
  },
}

export const PresentationSupportFlowIsAvailable: Story = {
  args: { prototypeMode: "presentation" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    const navigation = await canvas.findByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(within(navigation).getByRole("button", { name: "Contact support" }))

    const supportDialog = await canvas.findByRole("dialog", { name: "Contact support" })
    await expect(within(supportDialog).getByRole("heading", { name: "Support request" })).toBeVisible()
  },
}

export const NotificationOpensConversationAtItsLocation: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 new notifications" }))
    await userEvent.click(canvas.getByRole("button", { name: /New message from Lukas Weber/ }))

    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Mitte/,
    )
    const conversationHeading = canvas.getByRole("heading", { name: "Lukas Fixture" })
    await waitFor(() => expect(conversationHeading).toHaveFocus())
    await expect(canvas.getByText("Opened conversation at Berlin Health Clinic — Mitte.")).toBeVisible()
  },
}

export const NotificationOpensReviewAtItsLocation: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 new notifications" }))
    await userEvent.click(canvas.getByRole("button", { name: /New 3-star review needs a response/ }))

    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
    const review = canvas.getByRole("region", { name: "Review by Eva Fixture" })
    await waitFor(() => expect(review).toHaveFocus())
    await expect(canvas.queryByRole("dialog", { name: /review response/i })).not.toBeInTheDocument()
    await expect(canvas.getByText("Opened review at Berlin Health Clinic — Charlottenburg.")).toBeVisible()
  },
}

export const ProfileSaveProjectsIntoDashboard: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Review images" }))
    const taskDialog = canvas.getByRole("dialog", { name: "Missing images" })
    await userEvent.click(within(taskDialog).getByRole("button", { name: "Open image gallery" }))

    const gallery = canvas.getByRole("region", { name: "Clinic image gallery" })
    await waitFor(() => expect(gallery).toHaveFocus())
    await userEvent.click(within(gallery).getByRole("button", { name: "View all images" }))
    const galleryDialog = canvas.getByRole("dialog", { name: "Edit clinic images" })
    await userEvent.click(within(galleryDialog).getAllByRole("button", { name: "Set cover" })[0]!)
    await userEvent.click(within(galleryDialog).getByRole("button", { name: "Done" }))

    const clinicName = canvas.getByRole("textbox", { name: "Clinic name" })
    await userEvent.clear(clinicName)
    await userEvent.type(clinicName, "Berlin Health Clinic — Mitte Demo")
    const profileActions = within(canvas.getByRole("group", { name: "Profile page actions" }))
    await userEvent.click(profileActions.getByRole("button", { name: "Save changes" }))
    await expect(await canvas.findByText("Profile saved as revision 2.")).toBeVisible()

    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    const preview = canvas.getByRole("region", { name: "Dashboard clinic location summary" })
    await expect(within(preview).getByText("Berlin Health Clinic — Mitte Demo")).toBeVisible()
    await expect(within(preview).getByRole("img", { name: "Berlin Health Clinic exterior" })).toBeVisible()
    await expect(canvas.getAllByText("86%")[0]).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Review images" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Review team" })).toBeInTheDocument()
  },
}

export const MissingTreatmentOpensLocalSupport: Story = {
  args: { prototypeMode: "presentation", start: { section: "profile" } },
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
  },
}

export const InternalInterfaceModeSwitch: Story = {
  args: { prototypeMode: "presentation", showPrototypeModeToggle: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const modeSwitch = canvas.getByRole("switch", { name: "Demo scope" })

    await expect(modeSwitch).not.toBeChecked()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeVisible()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).toBeChecked()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).not.toBeChecked()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeVisible()
  },
}

export const MobileNavigation: Story = {
  args: { prototypeMode: "presentation", start: { section: "messages" } },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    const navigation = await canvas.findByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(within(navigation).getByRole("button", { name: "Clinic profile" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Clinic profile" })).toBeVisible()
  },
}
