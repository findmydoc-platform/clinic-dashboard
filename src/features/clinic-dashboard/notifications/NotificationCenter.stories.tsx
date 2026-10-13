import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import cases from "../../../../tests/fixtures/clinic-notifications-v1.json"
import { NotificationCenter } from "./NotificationCenter"
import { notificationsResponseSchema } from "./model/notification-schema"

const page = notificationsResponseSchema.parse(cases[0]!.response)
const commands = {
  load: fn(async (query: import("./model/notifications").NotificationReadQuery) => ({
    ok: true as const,
    value:
      query.mode === "summary"
        ? {
            contractVersion: "clinic-notifications-v1" as const,
            serverTime: "2026-10-14T09:00:01.000Z",
            mode: "summary" as const,
            unreadCount: 1,
            nextUnreadCountChangeAt: "2027-01-12T09:00:00.000Z",
          }
        : page.mode === "page"
          ? { ...page, view: query.view }
          : page,
  })),
}
const meta = {
  component: NotificationCenter,
  title: "Clinic Dashboard/Notifications/Organisms/Notification Center",
  tags: ["domain:notifications", "layer:organism", "status:stable"],
  parameters: { layout: "fullscreen" },
  args: { commands, initialState: { status: "ready", response: page }, open: false, onOpenChange: fn() },
  render: function ControlledCenter(args) {
    const [open, setOpen] = useState(args.open)
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
} satisfies Meta<typeof NotificationCenter>
export default meta
type Story = StoryObj<typeof meta>
export const NewInquiry: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 1 unread notification" }))
    const dialog = await canvas.findByRole("dialog", { name: "Notifications" })
    await expect(await within(dialog).findByText("Synthetic event")).toBeVisible()
    await expect(within(dialog).getByRole("tab", { name: "Unread (1)" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(within(dialog).queryByRole("button", { name: /mark.*read/i })).not.toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await expect(canvas.getByRole("button", { name: "Notifications, 1 unread notification" })).toHaveFocus()
  },
}
