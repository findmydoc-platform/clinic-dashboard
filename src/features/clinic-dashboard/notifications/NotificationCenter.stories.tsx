import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, within, waitFor } from "storybook/test"
import cases from "../../../../tests/fixtures/clinic-notifications-v1.json"
import { NotificationCenter } from "./NotificationCenter"
import { notificationsResponseSchema } from "./model/notification-schema"
import type { NotificationCommands, NotificationMarkResult } from "./model/notifications"

const page = notificationsResponseSchema.parse(cases[0]!.response)
const commands = {
  markRead: fn(async () => ({
    ok: true as const,
    value: {
      contractVersion: "clinic-notifications-v1" as const,
      serverTime: "2026-10-14T09:01:00.000Z",
      acknowledged: true as const,
    },
  })),
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
    await userEvent.click(within(dialog).getByRole("button", { name: "Options for Synthetic event" }))
    await expect(
      await within(dialog).findByRole("menuitem", { name: "Mark as read: Synthetic event" }),
    ).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await userEvent.keyboard("{Escape}")
    await expect(canvas.getByRole("button", { name: "Notifications, 1 unread notification" })).toHaveFocus()
  },
}
const renderPersonalMarking: NonNullable<Story["render"]> = function PersonalMarking(args) {
  const [source] = useState(() => {
    let read = false
    return {
      async load(query: import("./model/notifications").NotificationReadQuery) {
        return {
          ok: true as const,
          value:
            page.mode === "page"
              ? {
                  ...page,
                  view: query.mode === "page" ? query.view : ("unread" as const),
                  unreadCount: read ? 0 : 1,
                  nextUnreadCountChangeAt: read ? null : "2027-01-12T09:00:00.000Z",
                  items: read
                    ? query.mode === "page" && query.view === "all"
                      ? page.items.map((item) => ({
                          ...item,
                          members: item.members.map((member) => ({
                            ...member,
                            readAt: "2026-10-14T09:01:00.000Z",
                          })),
                        }))
                      : []
                    : page.items,
                }
              : page,
        }
      },
      markRead: fn(async (input: Readonly<{ notificationIds: readonly string[] }>) => {
        expect(input.notificationIds).toEqual(["notification-001"])
        read = true
        return {
          ok: true as const,
          value: {
            contractVersion: "clinic-notifications-v1" as const,
            serverTime: "2026-10-14T09:01:00.000Z",
            acknowledged: true as const,
          },
        }
      }),
    }
  })
  return (
    <div className="flex min-h-screen justify-end p-4">
      <NotificationCenter {...args} commands={source} open={true} />
    </div>
  )
}
const playExplicitMarking: NonNullable<Story["play"]> = async ({ canvasElement }) => {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole("button", { name: "Options for Synthetic event" }))
  await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark as read: Synthetic event" }))
  await expect(await canvas.findByText("Marked as read.")).toBeVisible()
  await expect(await canvas.findByText("You're all caught up.")).toBeVisible()
  await expect(canvas.getByRole("button", { name: "Notifications, 0 unread notifications" })).toBeVisible()
  await userEvent.click(canvas.getByRole("tab", { name: "All" }))
  await expect(await canvas.findByText("Synthetic event")).toBeVisible()
  await expect(canvas.queryByRole("button", { name: "Options for Synthetic event" })).not.toBeInTheDocument()
}
export const ExplicitMarking: Story = { render: renderPersonalMarking, play: playExplicitMarking }

function markingFailureRender(
  result: NotificationMarkResult,
  refreshFails: boolean | "throws" = false,
): NonNullable<Story["render"]> {
  return function MarkingOutcome(args) {
    const [source] = useState(() => {
      let submitted = false
      return {
        async load(query) {
          if (submitted && refreshFails === "throws") throw new Error("Refresh connection lost")
          if (submitted && refreshFails) return { ok: false, error: "SERVICE_UNAVAILABLE" }
          return commands.load(query)
        },
        markRead: fn(async () => {
          submitted = true
          return result
        }),
      } satisfies NotificationCommands
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} open={true} />
      </div>
    )
  }
}
async function markSynthetic(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole("button", { name: "Options for Synthetic event" }))
  await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark as read: Synthetic event" }))
  return canvas
}
export const DefiniteRejection: Story = {
  render: markingFailureRender({ ok: false, error: "SERVICE_UNAVAILABLE", writeOutcome: "not_committed" }),
  play: async ({ canvasElement }) => {
    const canvas = await markSynthetic(canvasElement)
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Notifications weren't marked as read.")
    await expect(canvas.getByRole("button", { name: "Try again" })).toBeEnabled()
    await expect(canvas.queryByText("Marked as read.")).not.toBeInTheDocument()
  },
}
export const UnknownOutcome: Story = {
  render: markingFailureRender({ ok: false, error: "SERVICE_UNAVAILABLE", writeOutcome: "unknown" }),
  play: async ({ canvasElement }) => {
    const canvas = await markSynthetic(canvasElement)
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We couldn't confirm whether these notifications were marked as read.",
    )
    await expect(canvas.getByRole("button", { name: "Check status" })).toBeEnabled()
    await expect(canvas.getByRole("button", { name: "Try again" })).toBeEnabled()
  },
}
export const ConfirmedThenRefreshFailed: Story = {
  render: markingFailureRender(
    {
      ok: true,
      value: {
        contractVersion: "clinic-notifications-v1",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
      },
    },
    true,
  ),
  play: async ({ canvasElement }) => {
    const canvas = await markSynthetic(canvasElement)
    await expect(
      await canvas.findByText("Marked as read. Notifications couldn't be refreshed."),
    ).toBeVisible()
    await expect(canvas.getByText("Synthetic event")).toBeVisible()
    await expect(canvas.getByText("List and unread count may be outdated.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }))
    await expect(
      await canvas.findByText("Marked as read. Notifications couldn't be refreshed."),
    ).toBeVisible()
  },
}
export const ThrottledUnknown: Story = {
  render: markingFailureRender({
    ok: false,
    error: "RATE_LIMITED",
    writeOutcome: "unknown",
    retryAfter: "1",
  }),
  play: async ({ canvasElement }) => {
    const canvas = await markSynthetic(canvasElement)
    await expect(await canvas.findByRole("button", { name: "Try again" })).toBeDisabled()
    await expect(canvas.getByRole("button", { name: "Check status" })).toBeDisabled()
    await waitFor(() => expect(canvas.getByRole("button", { name: "Try again" })).toBeEnabled(), {
      timeout: 2_000,
    })
  },
}
export const ConfirmedRefreshConnectionLost: Story = {
  render: markingFailureRender(
    {
      ok: true,
      value: {
        contractVersion: "clinic-notifications-v1",
        serverTime: "2026-10-14T09:01:00.000Z",
        acknowledged: true,
      },
    },
    "throws",
  ),
  play: async ({ canvasElement }) => {
    const canvas = await markSynthetic(canvasElement)
    await expect(
      await canvas.findByText("Marked as read. Notifications couldn't be refreshed."),
    ).toBeVisible()
    await expect(canvas.getByText("Synthetic event")).toBeVisible()
  },
}
export const FixedSelectionAfterLaterArrival: Story = {
  render: function LaterMessage(args) {
    const [source] = useState(() => {
      let submissions = 0
      let reads = 0
      return {
        async load(query) {
          reads += 1
          if (page.mode !== "page") throw new Error("Expected page fixture")
          const base = page.items[0]!.members[0]!
          const members = ["message-a", "message-b", ...(reads > 1 ? ["message-c"] : [])]
            .filter((id) => submissions < 2 || id === "message-c")
            .map((id) => ({
              ...base,
              sourceRecord: { kind: "inquiry" as const, id: "record-001" },
              notificationId: id,
              eventType: "patient_message_received" as const,
              sourceOccurrence: { kind: "patient_message" as const, id },
            }))
          return {
            ok: true as const,
            value: {
              ...page,
              view: query.mode === "page" ? query.view : ("unread" as const),
              items: [
                {
                  ...page.items[0]!,
                  kind: "patient_message_group" as const,
                  display: { eventLabel: `${members.length} new messages` },
                  members,
                },
              ],
            },
          }
        },
        markRead: fn(async (input) => {
          expect(input.notificationIds).toEqual(["message-a", "message-b"])
          submissions += 1
          return submissions === 1
            ? { ok: false as const, error: "SERVICE_UNAVAILABLE" as const, writeOutcome: "unknown" as const }
            : {
                ok: true as const,
                value: {
                  contractVersion: "clinic-notifications-v1" as const,
                  serverTime: "2026-10-14T09:01:00.000Z",
                  acknowledged: true as const,
                },
              }
        }),
      } satisfies NotificationCommands
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} open={true} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Options for 2 new messages" }))
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark as read: 2 new messages" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We couldn't confirm whether these notifications were marked as read.",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Check status" }))
    await expect(await canvas.findByText("3 new messages")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }))
    await expect(await canvas.findByText("Marked as read.")).toBeVisible()
    await expect(await canvas.findByText("1 new messages")).toBeVisible()
  },
}
export const MobileExplicitMarking: Story = {
  render: renderPersonalMarking,
  globals: { viewport: { value: "mobile320Short" } },
  play: async (context) => {
    await playExplicitMarking(context)
    await expect(context.canvasElement.scrollWidth).toBeLessThanOrEqual(context.canvasElement.clientWidth)
  },
}
export const MobileKeyboardMarking: Story = {
  render: renderPersonalMarking,
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("button", { name: "Options for Synthetic event" })).toBeVisible()
    await userEvent.keyboard("{Tab}{Tab}{Enter}")
    await expect(await canvas.findByRole("menuitem", { name: "Mark as read: Synthetic event" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(await canvas.findByText("You're all caught up.")).toBeVisible()
    await waitFor(() => expect(canvas.getByRole("tab", { name: "Unread (0)" })).toHaveFocus())
  },
}
export const KeyboardMarkingInAll: Story = {
  render: renderPersonalMarking,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("button", { name: "Options for Synthetic event" })).toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: "All" }))
    await expect(await canvas.findByRole("button", { name: "Options for Synthetic event" })).toBeVisible()
    await userEvent.keyboard("{Tab}{Tab}{Enter}{Enter}")
    await expect(await canvas.findByText("Marked as read.")).toBeVisible()
    await expect(await canvas.findByText("Synthetic event")).toBeVisible()
    await waitFor(() => expect(canvas.getByRole("tab", { name: "All" })).toHaveFocus())
  },
}
