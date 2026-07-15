import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import {
  NotificationCenter,
  type ClinicDashboardNotification,
} from "@/components/molecules/NotificationCenter"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { markAllNotificationsAsRead } from "@/lib/clinic-dashboard/notifications"

const meta = {
  component: NotificationCenter,
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        mobile320Short: { name: "Mobile 320 short", styles: { height: "700px", width: "320px" } },
      },
    },
  },
  tags: ["autodocs", "layer:molecule", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Molecules/Notification Center",
} satisfies Meta<typeof NotificationCenter>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  notifications: clinicDashboardFixture.notifications,
  onMarkAllAsRead: () => undefined,
  onOpenChange: () => undefined,
  open: false,
  readNotificationIds: [],
} satisfies Story["args"]

function StatefulNotificationCenter({
  initialOpen = false,
  initialReadNotificationIds = [],
  notifications = clinicDashboardFixture.notifications,
}: {
  initialOpen?: boolean
  initialReadNotificationIds?: readonly string[]
  notifications?: readonly ClinicDashboardNotification[]
}) {
  const [open, setOpen] = useState(initialOpen)
  const [readNotificationIds, setReadNotificationIds] =
    useState<readonly string[]>(initialReadNotificationIds)

  return (
    <div className="flex min-h-screen justify-end p-4">
      <NotificationCenter
        notifications={notifications}
        onMarkAllAsRead={() =>
          setReadNotificationIds((current) => markAllNotificationsAsRead(notifications, current))
        }
        onOpenChange={setOpen}
        open={open}
        readNotificationIds={readNotificationIds}
      />
    </div>
  )
}

export const ClosedUnread: Story = {
  args: defaultArgs,
  render: () => <StatefulNotificationCenter />,
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
  render: () => <StatefulNotificationCenter initialOpen />,
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
  render: () => (
    <StatefulNotificationCenter
      initialOpen
      initialReadNotificationIds={["message-lukas-weber", "review-response"]}
    />
  ),
}

const longNotificationList = Array.from({ length: 8 }, (_, index) => ({
  ...clinicDashboardFixture.notifications[index % clinicDashboardFixture.notifications.length],
  createdAt: `2023-10-${String(12 - index).padStart(2, "0")}T10:45:00.000Z`,
  id: `notification-${index}`,
  title: `Prototype notification ${index + 1}`,
}))

export const MobileScrollableList: Story = {
  args: { ...defaultArgs, notifications: longNotificationList, open: true },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => <StatefulNotificationCenter initialOpen notifications={longNotificationList} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = canvas.getByRole("dialog", { name: "Notifications" })
    const list = within(panel).getByRole("list", { name: "New notifications" })
    const viewportHeight = canvasElement.ownerDocument.defaultView?.innerHeight ?? 700

    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
    await expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewportHeight - 15)
  },
}
