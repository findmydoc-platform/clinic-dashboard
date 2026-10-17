import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, mocked, userEvent, waitFor, within } from "storybook/test"
import { ClinicDashboardWorkspaceHarness } from "@/features/clinic-dashboard/workspace/testing/public"
import { createReviewSourceCommandsFixture } from "@/features/clinic-dashboard/reviews/testing/public"
import { inquiryCommandsFixture } from "@/features/clinic-dashboard/messages/testing/public"
import {
  notificationCommandsFixture,
  notificationPageFixture,
} from "@/features/clinic-dashboard/notifications/testing/public"

const review = {
  id: "off-list-review",
  author: "Quinn R.",
  initials: "QR",
  publicMeasure: "none" as const,
  publicText: "Exact notification review outside the current list.",
  rating: 5 as const,
  reviewDate: "2026-10-14T10:00:00.000Z",
  treatment: { id: "dentistry", label: "Dentistry" },
  withdrawalState: "active" as const,
}
const notification = {
  ...notificationPageFixture.items[0]!,
  destination: { kind: "review" as const, reviewId: "off-list-review" },
  display: { eventLabel: "Review published", displayName: "Quinn R.", rating: 5 },
  members: [
    {
      ...notificationPageFixture.items[0]!.members[0]!,
      eventType: "review_published" as const,
      sourceRecord: { kind: "review" as const, id: "off-list-review" },
      sourceOccurrence: { kind: "review_transition" as const, id: "review-transition-204" },
    },
  ],
}
function notificationCommands() {
  return {
    ...notificationCommandsFixture,
    markRead: fn(notificationCommandsFixture.markRead),
    load: async (query: Parameters<typeof notificationCommandsFixture.load>[0]) =>
      query.mode === "summary"
        ? notificationCommandsFixture.load(query)
        : {
            ok: true as const,
            value: { ...notificationPageFixture, view: query.view, items: [notification] },
          },
  }
}
const meta = {
  component: ClinicDashboardWorkspaceHarness,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Review Notification Opening",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>
export default meta
type Story = StoryObj<typeof meta>
export const DisplayBeforePersonalMark: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => review) },
    notificationCommands: notificationCommands(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    let resolveDetail!: (value: typeof review) => void
    mocked(args.reviewCommands!.loadReview).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve
        }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Open Review published from Quinn R." }))
    expect(await canvas.findByText("Loading review details…")).toBeVisible()
    expect(args.notificationCommands!.markRead).not.toHaveBeenCalled()
    resolveDetail(review)
    expect(await canvas.findByText("Exact notification review outside the current list.")).toBeVisible()
    await waitFor(() =>
      expect(args.notificationCommands!.markRead).toHaveBeenCalledWith({
        notificationIds: ["fixture-notification-1"],
      }),
    )
    expect(
      await within(canvasElement.ownerDocument.body).findByText("Review opened. Marked as read."),
    ).toBeVisible()
  },
}
export const UnavailableReviewKeepsExplicitMarking: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => {
        throw new Error("Unavailable")
      }),
    },
    notificationCommands: notificationCommands(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Open Review published from Quinn R." }))
    expect(await canvas.findByText("This review is unavailable.")).toBeVisible()
    expect(args.notificationCommands!.markRead).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(
        body
          .getAllByRole("status")
          .find(
            (element) =>
              element.textContent ===
              "This review is unavailable. You can still mark the notification as read.",
          ),
      ).toBeVisible(),
    )
  },
}
export const InquiryDraftCancelsReviewOpening: Story = {
  args: {
    prototypeMode: "presentation",
    start: { section: "messages" },
    inquiryCommands: inquiryCommandsFixture,
    reviewCommands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => review) },
    notificationCommands: notificationCommands(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Reply to patient" }),
      "Preserved unsent inquiry reply.",
    )
    const originalConfirm = window.confirm
    window.confirm = fn(() => false)
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
      await userEvent.click(
        await canvas.findByRole("button", { name: "Open Review published from Quinn R." }),
      )
      expect(args.reviewCommands!.loadReview).not.toHaveBeenCalled()
      expect(args.notificationCommands!.markRead).not.toHaveBeenCalled()
      await userEvent.click(canvas.getByRole("button", { name: "Close notifications" }))
      expect(canvas.getByRole("textbox", { name: "Reply to patient" })).toHaveValue(
        "Preserved unsent inquiry reply.",
      )
    } finally {
      window.confirm = originalConfirm
    }
  },
}

export const UnknownMarkKeepsDisplayedReview: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => review) },
    notificationCommands: {
      ...notificationCommands(),
      markRead: fn(async () => ({
        ok: false as const,
        error: "SERVICE_UNAVAILABLE" as const,
        writeOutcome: "unknown" as const,
      })),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Notifications, 2 unread notifications" }))
    await userEvent.click(await canvas.findByRole("button", { name: "Open Review published from Quinn R." }))
    expect(await canvas.findByText("Exact notification review outside the current list.")).toBeVisible()
    expect(
      await body.findByText(
        "Review opened. We couldn't confirm whether these notifications were marked as read.",
      ),
    ).toBeVisible()
    expect(args.notificationCommands!.markRead).toHaveBeenCalledTimes(1)
  },
}
