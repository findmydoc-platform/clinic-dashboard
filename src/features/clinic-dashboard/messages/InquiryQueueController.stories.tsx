import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import type { InquiryWorkspaceCommands } from "./model/inquiry-status-commands"
import type { PatientInquiryDetail } from "./model/inquiries"
import {
  closedInquiryFixture,
  inquiryDetailFixtures,
  inquiryQueueFixture,
  spamInquiryFixture,
} from "./testing/public"
import { InquiryQueue } from "./InquiryQueueController"

function getDetail(inquiryId: string): PatientInquiryDetail {
  if (inquiryId === inquiryDetailFixtures.open.id) return inquiryDetailFixtures.open
  if (inquiryId === inquiryDetailFixtures.guest.id) return inquiryDetailFixtures.guest
  if (inquiryId === closedInquiryFixture.id) return closedInquiryFixture
  if (inquiryId === spamInquiryFixture.id) return spamInquiryFixture
  return { ...inquiryDetailFixtures.open, id: inquiryId }
}

const commands = {
  async addInternalNote(input) {
    const inquiry = getDetail(input.inquiryId)
    return {
      ok: true,
      value: {
        inquiry: {
          ...inquiry,
          revision: inquiry.revision + 1,
          timeline: [
            ...inquiry.timeline,
            {
              authorName: "Sarah Schmidt",
              body: input.text,
              createdAt: "2026-08-24T10:12:00.000Z",
              id: "story-note",
              kind: "internal-note" as const,
              timeLabel: "Just now",
            },
          ],
        },
      },
    }
  },
  async changeReadPosition(input) {
    return {
      ok: true,
      value: {
        unread: input.mode === "read" ? { count: 0, isUnread: false } : { count: 1, isUnread: true },
      },
    }
  },
  async changeState(input) {
    const inquiry = getDetail(input.inquiryId)
    const next =
      input.action === "set-handling-status"
        ? { ...inquiry, handlingStatus: input.handlingStatus, revision: inquiry.revision + 1 }
        : input.action === "close"
          ? { ...inquiry, lifecycle: "closed" as const, revision: inquiry.revision + 1 }
          : input.action === "reopen"
            ? { ...inquiry, lifecycle: "open" as const, revision: inquiry.revision + 1 }
            : input.action === "mark-spam"
              ? {
                  ...inquiry,
                  contact: { state: "masked" as const },
                  handlingStatus: "spam" as const,
                  lifecycle: "closed" as const,
                  revision: inquiry.revision + 1,
                }
              : {
                  ...inquiry,
                  handlingStatus: "submitted" as const,
                  lifecycle: "closed" as const,
                  revision: inquiry.revision + 1,
                }
    return { ok: true, value: { inquiry: next } }
  },
  async createAttachmentDraft({ file }) {
    return {
      ok: true,
      value: {
        draftId: "story-attachment-draft",
        expiresAt: "2026-08-24T12:00:00.000Z",
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        status: "ready" as const,
      },
    }
  },
  async discardAttachmentDraft() {
    return { ok: true, value: { discarded: true } }
  },
  async loadDetail({ inquiryId, knownChangeCursor }) {
    const inquiry = getDetail(inquiryId)
    return {
      ok: true,
      value: {
        changeCursor: inquiry.changeCursor,
        inquiry,
        unchanged: knownChangeCursor === inquiry.changeCursor,
      },
    }
  },
  async loadQueue() {
    return { ok: true, value: inquiryQueueFixture }
  },
  async revealContact({ inquiryId }) {
    const inquiry = getDetail(inquiryId)
    return {
      ok: true,
      value: {
        inquiry: {
          ...inquiry,
          contact: { email: "protected@example.com", phone: "+49 000 0000009", state: "full" as const },
        },
      },
    }
  },
  async sendExternalMessage(input) {
    const inquiry = getDetail(input.inquiryId)
    return {
      ok: true,
      value: {
        inquiry: {
          ...inquiry,
          handlingStatus: "contacted" as const,
          revision: inquiry.revision + 1,
          timeline: [
            ...inquiry.timeline,
            {
              author: { kind: "clinic" as const, label: "Clinic", staffName: "Sarah Schmidt" },
              body: input.text ?? "",
              createdAt: "2026-08-24T10:10:00.000Z",
              id: "story-reply",
              kind: "external-message" as const,
              timeLabel: "Just now",
            },
          ],
        },
      },
    }
  },
} satisfies InquiryWorkspaceCommands

const meta = {
  args: {
    commands,
    isActive: true,
    snapshot: inquiryQueueFixture,
  },
  component: InquiryQueue,
  globals: { viewport: { value: "desktop1440" } },
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Messages/Organisms/Inquiry Queue",
} satisfies Meta<typeof InquiryQueue>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()
  },
}

export const InquirySelectedAndReplied: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    const reply = await canvas.findByRole("textbox", { name: "Reply to patient" })
    await userEvent.type(reply, "We can review this synthetic case.")
    await userEvent.click(canvas.getByRole("button", { name: "Send reply" }))

    await expect(await canvas.findByText("We can review this synthetic case.")).toBeVisible()
    await expect(reply).toHaveValue("")
  },
}

export const HandlingStatusUpdated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    const status = await canvas.findByRole("combobox", { name: "Inquiry status" })
    await userEvent.selectOptions(status, "in_review")
    await waitFor(() => expect(status).toHaveValue("in_review"))
  },
}

export const MobileListAndDetail: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(await canvas.findByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Back to inquiries" }))
    await waitFor(() => expect(canvas.getByRole("button", { name: /Lukas Weber/ })).toHaveFocus())
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const DeepLinkedInquiryOutsideFirstPage: Story = {
  args: {
    focusInquiryId: closedInquiryFixture.id,
    onFocusHandled: fn(),
    snapshot: {
      changeCursor: inquiryQueueFixture.changeCursor,
      inquiries: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.inquiries.slice(0, 2) : [],
      nextCursor: "story-next-page",
      status: "ready",
      unchanged: false,
      unreadCount: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.unreadCount : 0,
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("region", { name: "Inquiry from Markus Schmidt" })).toBeVisible()
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Markus Schmidt" })).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const ForeignDeepLinkKeepsQueueUsable: Story = {
  args: {
    commands: {
      ...commands,
      loadDetail: async () => ({ error: { code: "not-found" }, ok: false }),
    },
    focusInquiryId: "inquiry-foreign-clinic",
    snapshot: {
      changeCursor: inquiryQueueFixture.changeCursor,
      inquiries: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.inquiries.slice(0, 2) : [],
      nextCursor: "story-next-page",
      status: "ready",
      unchanged: false,
      unreadCount: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.unreadCount : 0,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("heading", { name: "Select an inquiry" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Lukas Weber/ })).toBeEnabled()
    await expect(canvas.queryByText("inquiry-foreign-clinic")).not.toBeInTheDocument()
  },
}

export const DetailFailure: Story = {
  args: {
    commands: {
      ...commands,
      loadDetail: async () => ({ error: { code: "service-unavailable" }, ok: false }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(await canvas.findByRole("heading", { name: "Inquiry could not be loaded" })).toBeVisible()
  },
}
