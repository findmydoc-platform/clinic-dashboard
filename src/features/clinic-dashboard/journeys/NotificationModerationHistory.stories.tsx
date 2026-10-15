import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import cases from "../../../../tests/fixtures/clinic-notifications-v1.json"
import { NotificationCenter, type NotificationCommands } from "../notifications/public"
import { notificationsResponseSchema } from "../notifications/testing/public"

const moderationHistory = notificationsResponseSchema.parse({
  ...cases[8]!.response,
  unreadCount: 3,
  items: [
    ...cases[8]!.response.items!.map((item) => ({
      ...item,
      presentationId: "restriction",
      display: { eventLabel: "Inquiry restricted" },
      members: item.members.map((member) => ({ ...member, notificationId: "restriction" })),
    })),
    ...cases[9]!.response.items!.map((item) => ({
      ...item,
      presentationId: "restoration",
      display: { eventLabel: "Inquiry restored" },
      members: item.members.map((member) => ({ ...member, notificationId: "restoration" })),
    })),
    ...cases[11]!.response.items!.map((item) => ({
      ...item,
      presentationId: "appeal",
      display: { eventLabel: "Inquiry appeal decision", outcome: "lifted" },
      members: item.members.map((member) => ({ ...member, notificationId: "appeal" })),
    })),
  ],
})
const meta = {
  component: NotificationCenter,
  title: "Clinic Dashboard/Journeys/Pages/Notification Moderation History",
  tags: ["domain:workspace", "layer:page", "status:stable"],
  parameters: { layout: "fullscreen" },
  args: {
    commands: {
      load: async () => ({ ok: true as const, value: moderationHistory }),
      markRead: async () => ({
        ok: true as const,
        value: {
          contractVersion: "clinic-notifications-v1" as const,
          serverTime: "2026-10-14T09:01:00.000Z",
          acknowledged: true as const,
        },
      }),
    } satisfies NotificationCommands,
    initialState: { status: "ready", response: moderationHistory },
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof NotificationCenter>
export default meta
type Story = StoryObj<typeof meta>

const moderationHistoryRender: NonNullable<Story["render"]> = function ModerationHistory(args) {
  const [source] = useState(() => {
    const marked = new Set<string>()
    return {
      async load(query: Parameters<NotificationCommands["load"]>[0]) {
        if (moderationHistory.mode !== "page") throw new Error("Expected history page")
        const items = moderationHistory.items.map((item) => ({
          ...item,
          members: item.members.map((member) => ({
            ...member,
            readAt: marked.has(member.notificationId) ? "2026-10-14T09:01:00.000Z" : null,
          })),
        }))
        return {
          ok: true as const,
          value: {
            ...moderationHistory,
            unreadCount: 3 - marked.size,
            view: query.mode === "page" ? query.view : ("unread" as const),
            items:
              query.mode === "page" && query.view === "all"
                ? items
                : items.filter((item) => item.members[0]!.readAt === null),
          },
        }
      },
      async markRead(input: Readonly<{ notificationIds: readonly string[] }>) {
        expect(input.notificationIds).toEqual(["restriction"])
        input.notificationIds.forEach((id) => marked.add(id))
        return {
          ok: true as const,
          value: {
            contractVersion: "clinic-notifications-v1" as const,
            acknowledged: true as const,
            serverTime: "2026-10-14T09:01:00.000Z",
          },
        }
      },
    } satisfies NotificationCommands
  })
  return (
    <div className="flex min-h-screen justify-end p-4">
      <NotificationCenter {...args} commands={source} open={true} />
    </div>
  )
}
export const ModerationDistinctRestorationAndAppeal: Story = {
  args: { initialState: { status: "ready", response: moderationHistory } },
  render: moderationHistoryRender,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const stage = async (name: string, action: () => Promise<void>) => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          action(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("Moderation history story stalled: " + name)), 4000)
          }),
        ])
      } finally {
        clearTimeout(timeout)
      }
    }

    await stage("initial history", async () => {
      await expect(await canvas.findByText("Inquiry restricted")).toBeVisible()
      await expect(canvas.getByText("Inquiry restored")).toBeVisible()
      await expect(canvas.getByText("Restriction lifted")).toBeVisible()
      await expect(
        canvas.getByRole("button", { name: "Notifications, 3 unread notifications" }),
      ).toBeVisible()
    })
    await stage("open marking menu", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Options for Inquiry restricted" }))
      await expect(
        await canvas.findByRole("menuitem", { name: "Mark as read: Inquiry restricted" }),
      ).toBeVisible()
    })
    await stage("mark restriction", async () => {
      await userEvent.click(canvas.getByRole("menuitem", { name: "Mark as read: Inquiry restricted" }))
      await expect(
        await canvas.findByRole("button", { name: "Notifications, 2 unread notifications" }),
      ).toBeVisible()
      await expect(canvas.queryByText("Inquiry restricted")).not.toBeInTheDocument()
      await expect(canvas.getByText("Inquiry restored")).toBeVisible()
      await expect(canvas.getByText("Restriction lifted")).toBeVisible()
    })
    await stage("show read history", async () => {
      await userEvent.click(canvas.getByRole("tab", { name: "All" }))
      await expect(await canvas.findByText("Inquiry restricted")).toBeVisible()
      await expect(
        canvas.queryByRole("button", { name: "Options for Inquiry restricted" }),
      ).not.toBeInTheDocument()
    })
  },
}
export const ModerationMobileHistory: Story = {
  ...ModerationDistinctRestorationAndAppeal,
  globals: { viewport: { value: "mobile320Short" } },
}
export const ModerationDarkHistory: Story = {
  ...ModerationDistinctRestorationAndAppeal,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}
