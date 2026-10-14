import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import {
  inquiryCommandsFixture,
  closedInquiryFixture,
} from "@/features/clinic-dashboard/messages/testing/public"
import {
  notificationCommandsFixture,
  notificationPageFixture,
} from "@/features/clinic-dashboard/notifications/testing/public"
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

    await expect(canvas.getByRole("heading", { level: 1, name: "Reporting" })).toBeInTheDocument()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /Switch clinic location/ })).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }),
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

export const NotificationsKeepWorkspaceUntilOpening: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
    const dialog = await canvas.findByRole("dialog", { name: "Notifications" })
    await expect(await within(dialog).findByText("Ada Patient")).toBeVisible()
    await expect(within(dialog).getByRole("button", { name: "Mark 2 shown as read" })).toBeVisible()
    await userEvent.click(within(dialog).getByRole("tab", { name: "All" }))
    await expect(within(dialog).getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByRole("heading", { level: 1, name: "Reporting" })).toBeVisible()
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

    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    const navigation = await canvas.findByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(within(navigation).getByRole("button", { name: "Clinic profile" }))
    await expect(await canvas.findByRole("heading", { level: 1, name: "Clinic profile" })).toBeVisible()
  },
}

export const NotificationOpeningPreservesInquiryDraftOnCancel: Story = {
  args: {
    prototypeMode: "presentation",
    start: { section: "messages" },
    inquiryCommands: { ...inquiryCommandsFixture, loadDetail: fn(inquiryCommandsFixture.loadDetail) },
    notificationCommands: {
      ...notificationCommandsFixture,
      markRead: fn(notificationCommandsFixture.markRead),
      load: async (query) =>
        query.mode === "summary"
          ? notificationCommandsFixture.load(query)
          : {
              ok: true,
              value: {
                ...notificationPageFixture,
                view: query.view,
                items: [
                  {
                    ...notificationPageFixture.items[0]!,
                    destination: { kind: "inquiry", inquiryId: closedInquiryFixture.id },
                  },
                ],
              },
            },
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Reply to patient" }),
      "Keep this unsent reply.",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Internal note" }))
    await userEvent.type(canvas.getByRole("textbox", { name: "Internal note" }), "Keep this internal note.")
    await userEvent.click(canvas.getByRole("button", { name: "Reply to patient" }))
    await userEvent.upload(
      canvas.getByLabelText("Choose reply attachment"),
      new File(["synthetic attachment"], "unsent.png", { type: "image/png" }),
    )
    await expect(await canvas.findByText("unsent.png", { exact: true })).toBeVisible()
    const calls = (args.inquiryCommands!.loadDetail as ReturnType<typeof fn>).mock.calls.length
    const originalConfirm = window.confirm
    window.confirm = fn(() => false)
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
      await userEvent.click(await canvas.findByRole("button", { name: "Open New inquiry from Ada Patient" }))
      await expect(args.inquiryCommands!.loadDetail).toHaveBeenCalledTimes(calls)
      await expect(args.notificationCommands!.markRead).not.toHaveBeenCalled()
      await userEvent.click(canvas.getByRole("button", { name: "Close notifications" }))
      await expect(canvas.getByRole("textbox", { name: "Reply to patient" })).toHaveValue(
        "Keep this unsent reply.",
      )
      await expect(canvas.getByText("unsent.png", { exact: true })).toBeVisible()
      await userEvent.click(canvas.getByRole("button", { name: "Internal note" }))
      await expect(canvas.getByRole("textbox", { name: "Internal note" })).toHaveValue(
        "Keep this internal note.",
      )
      await userEvent.click(canvas.getByRole("button", { name: "Reply to patient" }))
      window.confirm = fn(() => true)
      await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
      await userEvent.click(await canvas.findByRole("button", { name: "Open New inquiry from Ada Patient" }))
      await expect(await canvas.findByRole("region", { name: "Inquiry from Markus Schmidt" })).toBeVisible()
      await waitFor(() =>
        expect(args.notificationCommands!.markRead).toHaveBeenCalledWith({
          notificationIds: ["fixture-notification-1"],
        }),
      )
    } finally {
      window.confirm = originalConfirm
    }
  },
}
