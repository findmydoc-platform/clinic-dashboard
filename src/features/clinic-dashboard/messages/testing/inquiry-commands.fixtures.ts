import type { InquiryWorkspaceCommands } from "../model/inquiry-status-commands"
import type { PatientInquiryDetail } from "../model/inquiries"
import {
  closedInquiryFixture,
  inquiryDetailFixtures,
  inquiryQueueFixture,
  spamInquiryFixture,
} from "./messages.fixtures"

function getDetail(inquiryId: string): PatientInquiryDetail {
  if (inquiryId === inquiryDetailFixtures.open.id) return inquiryDetailFixtures.open
  if (inquiryId === inquiryDetailFixtures.guest.id) return inquiryDetailFixtures.guest
  if (inquiryId === closedInquiryFixture.id) return closedInquiryFixture
  if (inquiryId === spamInquiryFixture.id) return spamInquiryFixture
  return { ...inquiryDetailFixtures.open, id: inquiryId }
}

export const inquiryCommandsFixture = {
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
