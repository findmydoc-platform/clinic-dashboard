import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { markAllNotificationsAsRead } from "../../model/notifications"
import { notificationsFixture } from "../../testing/workspace.fixtures"
import { NotificationCenter } from "./NotificationCenter"

const meta = {
  component: NotificationCenter,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => (
    <ControlledNotificationCenter key={`${args.open}-${args.readNotificationIds.join("-")}`} {...args} />
  ),
  tags: ["domain:workspace", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Organisms/Notification Center",
} satisfies Meta<typeof NotificationCenter>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  notifications: notificationsFixture,
  onMarkAllAsRead: fn(),
  onOpenChange: fn(),
  open: false,
  readNotificationIds: [],
} satisfies Story["args"]

function ControlledNotificationCenter(props: ComponentProps<typeof NotificationCenter>) {
  const [open, setOpen] = useState(props.open)
  const [readNotificationIds, setReadNotificationIds] = useState(props.readNotificationIds)

  return (
    <div className="flex min-h-screen justify-end p-4">
      <NotificationCenter
        {...props}
        onMarkAllAsRead={() => {
          props.onMarkAllAsRead()
          setReadNotificationIds((current) => markAllNotificationsAsRead(props.notifications, current))
        }}
        onOpenChange={(nextOpen) => {
          props.onOpenChange(nextOpen)
          setOpen(nextOpen)
        }}
        open={open}
        readNotificationIds={readNotificationIds}
      />
    </div>
  )
}

export const ClosedUnread: Story = {
  args: defaultArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Notifications, 2 new notifications" })

    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await expect(canvas.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
  },
}

export const OpenUnread: Story = {
  args: { ...defaultArgs, open: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = canvas.getByRole("dialog", { name: "Notifications" })

    await expect(within(panel).getAllByRole("listitem")).toHaveLength(2)
    await userEvent.click(within(panel).getByRole("button", { name: "Mark all as read" }))
    const status = within(panel).getByRole("status")
    await waitFor(() => expect(status).toHaveFocus())
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Notifications, no new notifications" })).toHaveFocus(),
    )
  },
}

export const OpenAllRead: Story = {
  args: { ...defaultArgs, open: true, readNotificationIds: ["message-lukas-weber", "review-response"] },
}

const longNotificationList = Array.from({ length: 8 }, (_, index) => ({
  ...notificationsFixture[index % notificationsFixture.length],
  createdAt: `2023-10-${String(12 - index).padStart(2, "0")}T10:45:00.000Z`,
  id: `notification-${index}`,
  title: `Prototype notification ${index + 1}`,
}))

export const MobileScrollableList: Story = {
  args: { ...defaultArgs, notifications: longNotificationList, open: true },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = canvas.getByRole("dialog", { name: "Notifications" })
    const list = within(panel).getByRole("list", { name: "New notifications" })
    const viewportHeight = canvasElement.ownerDocument.defaultView?.innerHeight ?? 700

    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
    await expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewportHeight - 15)
  },
}
