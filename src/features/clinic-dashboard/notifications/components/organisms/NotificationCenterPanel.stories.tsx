import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { notificationPageFixture } from "../../testing/notifications.fixtures"
import { NotificationCenterPanel } from "./NotificationCenterPanel"

const meta = {
  component: NotificationCenterPanel,
  title: "Clinic Dashboard/Notifications/Organisms/Notification Center Panel",
  tags: ["domain:notifications", "layer:organism", "status:stable"],
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    onOpenChange: fn(),
    model: { state: { status: "ready", response: notificationPageFixture }, unreadCount: 2, view: "unread" },
    actions: { selectView: fn(), retry: fn() },
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-screen justify-end p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationCenterPanel>
export default meta
type Story = StoryObj<typeof meta>
export const Unread: Story = {}
export const Loading: Story = {
  args: { model: { state: { status: "loading" }, view: "unread" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("status")).toHaveTextContent("Loading notifications…")
    await expect(canvas.getByRole("button", { name: "Notifications, count unavailable" })).toBeInTheDocument()
    await expect(canvas.queryByText("You're all caught up.")).not.toBeInTheDocument()
  },
}
export const EmptyUnread: Story = {
  args: {
    model: {
      state: {
        status: "ready",
        response: { ...notificationPageFixture, items: [], unreadCount: 0, nextUnreadCountChangeAt: null },
      },
      unreadCount: 0,
      view: "unread",
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("You're all caught up.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "View all notifications" }))
    await expect(args.actions.selectView).toHaveBeenCalledWith("all")
  },
}
export const EmptyAll: Story = {
  args: {
    model: {
      state: {
        status: "ready",
        response: {
          ...notificationPageFixture,
          items: [],
          unreadCount: 0,
          nextUnreadCountChangeAt: null,
          view: "all",
        },
      },
      unreadCount: 0,
      view: "all",
    },
  },
}
export const Failure: Story = {
  args: { model: { state: { status: "unavailable", error: "SERVICE_UNAVAILABLE" }, view: "unread" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Notifications couldn't be loaded.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }))
    await expect(args.actions.retry).toHaveBeenCalled()
    await expect(canvas.queryByText("You're all caught up.")).not.toBeInTheDocument()
  },
}
export const AccessDenied: Story = {
  args: { model: { state: { status: "unavailable", error: "CLINIC_ACCESS_DENIED" }, view: "unread" } },
}
export const Mobile: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = await canvas.findByRole("dialog", { name: "Notifications" })
    await expect(dialog).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}")
    await expect(canvas.getByRole("button", { name: "Close notifications" })).toHaveFocus()
  },
}
export const Dark: Story = { globals: { theme: "dark" } }
