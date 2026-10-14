import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, within, waitFor } from "storybook/test"
import cases from "../../../../tests/fixtures/clinic-notifications-v1.json"
import { NotificationCenter } from "./NotificationCenter"
import { notificationsResponseSchema } from "./model/notification-schema"
import type { NotificationCommands, NotificationMarkResult, NotificationItem } from "./model/notifications"

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

export const OpensBeforePersonalMarking: Story = {
  args: { onDestinationOpen: fn(), commands: { ...commands, markRead: fn(commands.markRead) } },
  render: function Opening(args) {
    const [open, setOpen] = useState(true)
    const [target] = useState(() => {
      let display: (() => void) | undefined
      return {
        open: async () => {
          await new Promise<void>((resolve) => {
            display = resolve
          })
          return "displayed" as const
        },
        display: () => display?.(),
      }
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <button onClick={target.display}>Display exact destination</button>
        <NotificationCenter {...args} open={open} onOpenChange={setOpen} onDestinationOpen={target.open} />
      </div>
    )
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open Synthetic event" }))
    await expect(args.commands.markRead).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Display exact destination" }))
    await waitFor(() =>
      expect(args.commands.markRead).toHaveBeenCalledWith({ notificationIds: ["notification-001"] }),
    )
  },
}
export const UnavailableTargetAllowsExplicitMarking: Story = {
  args: {
    onDestinationOpen: fn(async () => "unavailable" as const),
    commands: { ...commands, markRead: fn(commands.markRead) },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 1 unread notification" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Open Synthetic event" }))
    await expect(
      await canvas.findByText("This inquiry is unavailable. You can still mark the notification as read."),
    ).toBeVisible()
    await expect(args.commands.markRead).not.toHaveBeenCalled()
    await userEvent.click(await canvas.findByRole("button", { name: "Options for Synthetic event" }))
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark as read: Synthetic event" }))
    await waitFor(() => expect(args.commands.markRead).toHaveBeenCalledOnce())
  },
}

export const OpeningKeepsOriginalMembersDuringRefresh: Story = {
  args: { commands: { ...commands, markRead: fn(commands.markRead) } },
  render: function FixedOpening(args) {
    const [source] = useState(() => {
      let finish: (() => void) | undefined
      let reads = 0
      return {
        finish: () => finish?.(),
        open: async () => {
          await new Promise<void>((resolve) => {
            finish = resolve
          })
          return "displayed" as const
        },
        commands: {
          ...args.commands,
          async load(query: import("./model/notifications").NotificationReadQuery) {
            reads += 1
            if (page.mode !== "page") throw new Error("Expected page")
            const base = page.items[0]!
            return {
              ok: true as const,
              value: {
                ...page,
                view: query.mode === "page" ? query.view : ("unread" as const),
                items: [
                  {
                    ...base,
                    kind: "patient_message_group" as const,
                    display: { eventLabel: reads > 1 ? "3 new messages" : "2 new messages" },
                    members: ["selected-a", "selected-b", ...(reads > 1 ? ["later-c"] : [])].map((id) => ({
                      ...base.members[0]!,
                      sourceRecord: { kind: "inquiry" as const, id: "record-001" },
                      notificationId: id,
                      eventType: "patient_message_received" as const,
                      sourceOccurrence: { kind: "patient_message" as const, id },
                    })),
                  },
                ],
              },
            }
          },
        },
      }
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <button onClick={source.finish}>Display selected inquiry</button>
        <NotificationCenter
          {...args}
          commands={source.commands}
          open={true}
          onDestinationOpen={source.open}
        />
      </div>
    )
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open 2 new messages" }))
    await userEvent.click(canvas.getByRole("tab", { name: "All" }))
    await expect(await canvas.findByText("3 new messages")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Display selected inquiry" }))
    await waitFor(() =>
      expect(args.commands.markRead).toHaveBeenCalledWith({ notificationIds: ["selected-a", "selected-b"] }),
    )
  },
}
export const ScopeReplacementCancelsPendingOpening: Story = {
  args: { commands: { ...commands, markRead: fn(commands.markRead) } },
  render: function ChangedScope(args) {
    const [scope, setScope] = useState("first-scope")
    const [target] = useState(() => {
      let finish: (() => void) | undefined
      return {
        finish: () => finish?.(),
        open: async () => {
          await new Promise<void>((resolve) => {
            finish = resolve
          })
          return "displayed" as const
        },
      }
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <button onClick={() => setScope("new-scope")}>Change authenticated scope</button>
        <button onClick={target.finish}>Finish previous opening</button>
        <NotificationCenter key={scope} {...args} open={true} onDestinationOpen={target.open} />
      </div>
    )
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open Synthetic event" }))
    await userEvent.click(canvas.getByRole("button", { name: "Change authenticated scope" }))
    await userEvent.click(canvas.getByRole("button", { name: "Finish previous opening" }))
    await expect(args.commands.markRead).not.toHaveBeenCalled()
  },
}

export const MobileKeyboardOpening: Story = {
  args: {
    open: true,
    onDestinationOpen: fn(async () => "displayed" as const),
    commands: { ...commands, markRead: fn(commands.markRead) },
  },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("button", { name: "Open Synthetic event" })).toBeVisible()
    await userEvent.keyboard("{Tab}{Tab}")
    await expect(canvas.getByRole("button", { name: "Open Synthetic event" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(args.onDestinationOpen).toHaveBeenCalledOnce())
    await waitFor(() =>
      expect(args.commands.markRead).toHaveBeenCalledWith({ notificationIds: ["notification-001"] }),
    )
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
export const DarkOpenedTargetWithUnknownReceipt: Story = {
  args: {
    open: true,
    onDestinationOpen: fn(async () => "displayed" as const),
    commands: {
      ...commands,
      markRead: fn(async () => ({
        ok: false as const,
        error: "SERVICE_UNAVAILABLE" as const,
        writeOutcome: "unknown" as const,
      })),
    },
  },
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open Synthetic event" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We couldn't confirm whether these notifications were marked as read.",
    )
    await expect(args.onDestinationOpen).toHaveBeenCalledOnce()
    await expect(canvas.getByRole("button", { name: "Check status" })).toBeEnabled()
  },
}

const moderationConfirmed = notificationsResponseSchema.parse({
  ...cases[10]!.response,
  items: cases[10]!.response.items!.map((item) => ({
    ...item,
    display: { eventLabel: "Inquiry appeal decision", outcome: "confirmed" },
  })),
})
const moderationCommands = {
  ...commands,
  load: fn(async () => ({ ok: true as const, value: moderationConfirmed })),
  markRead: fn(commands.markRead),
} satisfies NotificationCommands
export const ModerationConfirmedOutcome: Story = {
  args: {
    open: true,
    initialState: { status: "ready", response: moderationConfirmed },
    commands: moderationCommands,
    onDestinationOpen: fn(async () => "displayed" as const),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Restriction confirmed")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Open Inquiry appeal decision" })).toBeVisible()
    await expect(canvas.queryByText("confirmed", { exact: true })).not.toBeInTheDocument()
  },
}

const moderationLifted = notificationsResponseSchema.parse({
  ...cases[11]!.response,
  items: cases[11]!.response.items!.map((item) => ({
    ...item,
    display: { eventLabel: "Inquiry appeal decision", outcome: "lifted" },
  })),
})
export const ModerationLiftedOutcome: Story = {
  args: {
    open: true,
    initialState: { status: "ready", response: moderationLifted },
    onDestinationOpen: fn(async () => "displayed" as const),
    commands: { ...commands, load: fn(async () => ({ ok: true as const, value: moderationLifted })) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Restriction lifted")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Open Inquiry appeal decision" })).toBeVisible()
  },
}
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
const moderationHistoryRender: NonNullable<Story["render"]> = function ModerationHistory(args) {
  const [source] = useState(() => {
    const marked = new Set<string>()
    return {
      async load(query: import("./model/notifications").NotificationReadQuery) {
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
    await expect(await canvas.findByText("Inquiry restricted")).toBeVisible()
    await expect(canvas.getByText("Inquiry restored")).toBeVisible()
    await expect(canvas.getByText("Restriction lifted")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Notifications, 3 unread notifications" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Options for Inquiry restricted" }))
    await userEvent.click(await canvas.findByRole("menuitem", { name: "Mark as read: Inquiry restricted" }))
    await expect(
      await canvas.findByRole("button", { name: "Notifications, 2 unread notifications" }),
    ).toBeVisible()
    await expect(canvas.queryByText("Inquiry restricted")).not.toBeInTheDocument()
    await expect(canvas.getByText("Inquiry restored")).toBeVisible()
    await expect(canvas.getByText("Restriction lifted")).toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: "All" }))
    await expect(await canvas.findByText("Inquiry restricted")).toBeVisible()
    await expect(
      canvas.queryByRole("button", { name: "Options for Inquiry restricted" }),
    ).not.toBeInTheDocument()
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
export const ModerationUnavailableTarget: Story = {
  args: {
    open: true,
    initialState: { status: "ready", response: moderationConfirmed },
    commands: moderationCommands,
    onDestinationOpen: fn(async () => "unavailable" as const),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open Inquiry appeal decision" }))
    await expect(
      await canvas.findByText("This inquiry is unavailable. You can still mark the notification as read."),
    ).toBeVisible()
    await expect(args.commands.markRead).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Options for Inquiry appeal decision" }))
    await userEvent.click(
      await canvas.findByRole("menuitem", { name: "Mark as read: Inquiry appeal decision" }),
    )
    await waitFor(() => expect(args.commands.markRead).toHaveBeenCalledOnce())
  },
}
export const ModerationCancelledOpening: Story = {
  args: {
    open: true,
    initialState: { status: "ready", response: moderationConfirmed },
    commands: moderationCommands,
    onDestinationOpen: fn(async () => "cancelled" as const),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Open Inquiry appeal decision" }))
    await expect(args.onDestinationOpen).toHaveBeenCalledOnce()
    await expect(args.commands.markRead).not.toHaveBeenCalled()
    await expect(canvas.getByText("Restriction confirmed")).toBeVisible()
  },
}
const fixture = notificationsResponseSchema.parse(
  cases.find((item) => item.name === "complete_unread_group_and_individual_read_history")!.response,
)
if (fixture.mode !== "page") throw new Error("Expected complete group fixture")
const group = fixture.items[0]!
const messageGroupCommands: NotificationCommands = {
  load: fn(async (query) => ({
    ok: true as const,
    value:
      query.mode === "summary"
        ? {
            contractVersion: "clinic-notifications-v1" as const,
            serverTime: fixture.serverTime,
            mode: "summary" as const,
            unreadCount: 1,
            nextUnreadCountChangeAt: "2027-01-12T09:09:00.000Z",
          }
        : { ...fixture, view: query.view, items: query.view === "unread" ? [group] : fixture.items },
  })),
  markRead: fn(async () => ({
    ok: true as const,
    value: {
      contractVersion: "clinic-notifications-v1" as const,
      serverTime: fixture.serverTime,
      acknowledged: true as const,
    },
  })),
}
const messageGroupArgs = {
  commands: messageGroupCommands,
  initialState: {
    status: "ready" as const,
    response: { ...fixture, view: "unread" as const, items: [group] },
  },
  open: true,
}
export const PatientMessageNewestTime: Story = {
  args: messageGroupArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("2 new messages")).toBeVisible()
    await expect(canvas.getByText("9:09 AM")).toBeVisible()
    await expect(canvas.queryByText("9:05 AM")).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Notifications, 1 unread notification" })).toBeVisible()
  },
}
export const PatientMessagePersonalHistory: Story = {
  args: messageGroupArgs,
  render: function PersonalGroup(args) {
    const [source] = useState(() => {
      let acknowledged = false
      return {
        async load(query) {
          const items: NotificationItem[] = acknowledged
            ? query.mode === "page" && query.view === "all"
              ? group.members.map((member) => ({
                  ...group,
                  kind: "occurrence",
                  presentationId: member.notificationId,
                  display: { eventLabel: "New patient message" },
                  members: [{ ...member, readAt: fixture.serverTime }],
                }))
              : []
            : [group]
          return {
            ok: true as const,
            value: {
              ...fixture,
              view: query.mode === "page" ? query.view : ("unread" as const),
              unreadCount: acknowledged ? 0 : 1,
              nextUnreadCountChangeAt: acknowledged ? null : "2027-01-12T09:09:00.000Z",
              items,
            },
          }
        },
        markRead: fn(async (input) => {
          expect(input.notificationIds).toEqual(["group-oldest", "group-newest"])
          acknowledged = true
          return {
            ok: true as const,
            value: {
              contractVersion: "clinic-notifications-v1" as const,
              serverTime: fixture.serverTime,
              acknowledged: true as const,
            },
          }
        }),
      } satisfies NotificationCommands
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Options for 2 new messages from Synthetic Patient" }),
    )
    await userEvent.click(
      await canvas.findByRole("menuitem", { name: "Mark as read: 2 new messages from Synthetic Patient" }),
    )
    await expect(await canvas.findByText("You're all caught up.")).toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: "All" }))
    await waitFor(() => expect(canvas.getAllByText("New patient message")).toHaveLength(2))
    await expect(canvas.queryByRole("button", { name: /Options for/ })).not.toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
export const PatientMessageOldestAnchor: Story = {
  args: {
    ...messageGroupArgs,
    onDestinationOpen: fn(async () => "displayed" as const),
    commands: { ...messageGroupCommands, markRead: fn(messageGroupCommands.markRead) },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Open 2 new messages from Synthetic Patient" }),
    )
    await waitFor(() =>
      expect(args.onDestinationOpen).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: {
            kind: "inquiry",
            inquiryId: "record-203",
            anchor: { kind: "message", id: "source-oldest" },
          },
        }),
        expect.any(AbortSignal),
      ),
    )
    await waitFor(() =>
      expect(args.commands.markRead).toHaveBeenCalledWith({
        notificationIds: ["group-oldest", "group-newest"],
      }),
    )
  },
}
export const PatientMessageMobileHistory: Story = {
  args: messageGroupArgs,
  render: PatientMessagePersonalHistory.render,
  play: PatientMessagePersonalHistory.play,
  globals: { viewport: { value: "mobile320Short" } },
}
export const PatientMessageDarkNewestTime: Story = {
  args: messageGroupArgs,
  play: PatientMessageNewestTime.play,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}

export const PaginatedHistory: Story = {
  args: messageGroupArgs,
  render: function PaginatedHistoryCenter(args) {
    const [source] = useState(() => ({
      load: fn(async (query: import("./model/notifications").NotificationReadQuery) => {
        if (query.mode === "summary")
          return {
            ok: true as const,
            value: {
              contractVersion: "clinic-notifications-v1" as const,
              mode: "summary" as const,
              serverTime: fixture.serverTime,
              unreadCount: 1,
              nextUnreadCountChangeAt: "2027-01-12T09:09:00.000Z",
            },
          }
        if (!query.cursor)
          return {
            ok: true as const,
            value: { ...fixture, view: query.view, items: [group], nextCursor: "page-2" },
          }
        expect(query).toEqual({ mode: "page", view: "all", cursor: "page-2" })
        return {
          ok: true as const,
          value: {
            contractVersion: "clinic-notifications-v1" as const,
            mode: "page" as const,
            serverTime: fixture.serverTime,
            view: "all" as const,
            items: [group, fixture.items[1]!],
            nextCursor: null,
          },
        }
      }),
      markRead: fn(messageGroupCommands.markRead),
    }))
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("tab", { name: "All" }))
    await expect(await canvas.findByRole("button", { name: "Load more" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Load more" }))
    await expect(await canvas.findByText("New patient message")).toBeVisible()
    await expect(canvas.getAllByText("2 new messages")).toHaveLength(1)
    await expect(canvas.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Notifications, 1 unread notification" })).toBeVisible()
  },
}

export const PaginationFailureRecovery: Story = {
  args: messageGroupArgs,
  render: function PaginatedFailureCenter(args) {
    const [source] = useState(() => {
      let continuationAttempts = 0
      return {
        async load(query) {
          if (query.mode === "summary") return messageGroupCommands.load(query)
          if (!query.cursor)
            return {
              ok: true as const,
              value: { ...fixture, view: query.view, items: [group], nextCursor: "page-2" },
            }
          continuationAttempts += 1
          if (continuationAttempts === 1) return { ok: false as const, error: "SERVICE_UNAVAILABLE" as const }
          return {
            ok: true as const,
            value: {
              contractVersion: "clinic-notifications-v1" as const,
              mode: "page" as const,
              serverTime: fixture.serverTime,
              view: query.view,
              items: [fixture.items[1]!],
              nextCursor: null,
            },
          }
        },
        markRead: messageGroupCommands.markRead,
      } satisfies NotificationCommands
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Load more" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Older notifications couldn't be loaded.",
    )
    await expect(canvas.getByText("2 new messages")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Try loading again" }))
    await expect(await canvas.findByText("New patient message")).toBeVisible()
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument()
  },
}

export const IncompatiblePaginationReload: Story = {
  args: messageGroupArgs,
  render: function IncompatiblePageCenter(args) {
    const [source] = useState(() => {
      let firstPageLoads = 0
      return {
        async load(query) {
          if (query.mode === "summary") return messageGroupCommands.load(query)
          if (!query.cursor) {
            firstPageLoads += 1
            return {
              ok: true as const,
              value: {
                ...fixture,
                view: query.view,
                items: firstPageLoads === 1 ? [group] : [group, fixture.items[1]!],
                nextCursor: firstPageLoads === 1 ? "page-2" : null,
              },
            }
          }
          return {
            ok: true as const,
            value: {
              contractVersion: "clinic-notifications-v1" as const,
              mode: "page" as const,
              serverTime: fixture.serverTime,
              view: query.view,
              items: [],
              nextCursor: "page-3",
            },
          }
        },
        markRead: messageGroupCommands.markRead,
      } satisfies NotificationCommands
    })
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Load more" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Older notifications couldn't be loaded.",
    )
    await expect(canvas.getByText("2 new messages")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Reload notifications" }))
    await expect(await canvas.findByText("New patient message")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument()
  },
}

export const ObsoletePaginationIgnored: Story = {
  args: messageGroupArgs,
  render: function ObsoletePageCenter(args) {
    const [source] = useState(() => ({
      load: fn(async (query: import("./model/notifications").NotificationReadQuery, signal?: AbortSignal) => {
        if (query.mode === "summary") return messageGroupCommands.load(query)
        if (!query.cursor)
          return {
            ok: true as const,
            value: {
              ...fixture,
              view: query.view,
              items: [group],
              nextCursor: query.view === "unread" ? "unread-page-2" : null,
            },
          }
        return new Promise<Awaited<ReturnType<NotificationCommands["load"]>>>((resolve) => {
          signal?.addEventListener(
            "abort",
            () =>
              resolve({
                ok: true,
                value: {
                  contractVersion: "clinic-notifications-v1",
                  mode: "page",
                  serverTime: fixture.serverTime,
                  view: "unread",
                  items: [fixture.items[1]!],
                  nextCursor: null,
                },
              }),
            { once: true },
          )
        })
      }),
      markRead: messageGroupCommands.markRead,
    }))
    return (
      <div className="flex min-h-screen justify-end p-4">
        <NotificationCenter {...args} commands={source} />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole("button", { name: "Load more" }))
    await expect(canvas.getByRole("button", { name: "Loading older notifications…" })).toBeVisible()
    await userEvent.click(canvas.getByRole("tab", { name: "All" }))
    await expect(await canvas.findByText("2 new messages")).toBeVisible()
    await expect(canvas.queryByText("New patient message")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument()
  },
}
