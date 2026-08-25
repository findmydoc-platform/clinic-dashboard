import "server-only"

import {
  getInquiryHandlingStatusTargets,
  type InquiryAttachment,
  type InquiryHandlingStatus,
  type InquiryResult,
  type PatientInquiry,
  type PatientInquiryDetail,
} from "../model/inquiries"
import type {
  InquiryAttachmentContent,
  PatientInquiryAttachmentDraftUpload,
  PatientInquiryProvider,
} from "./patient-inquiry-provider"

const syntheticAttachment = {
  id: "attachment-lukas-1",
  mimeType: "application/pdf",
  name: "assessment-photos.pdf",
  sizeBytes: 720_000,
} as const satisfies InquiryAttachment

function details(): PatientInquiryDetail[] {
  return [
    {
      actions: {
        canAddInternalNote: true,
        canChangeHandlingStatus: true,
        canChangeLifecycle: true,
        canMarkRead: true,
        canMarkUnread: false,
        canReply: true,
        canRevealContact: false,
      },
      changeCursor: "controlled-4",
      contact: { email: "l.weber@example.test", phone: "+49 000 0000001", state: "full" },
      contactWindow: "Weekdays after 16:00",
      conversation: { id: "conversation-lukas", kind: "bound" },
      createdAt: "2026-08-24T08:45:00.000Z",
      handlingStatus: "contacted",
      id: "inquiry-lukas-weber",
      interest: "Hair transplant",
      lastActivityAt: "2026-08-24T09:02:00.000Z",
      lastActivityLabel: "24 Aug, 11:02",
      lastActivityPreview: "Here are the requested photos. I hope they help.",
      latestActivityKind: "external-message",
      lifecycle: "open",
      originalRequest:
        "I am interested in a hair transplant and would like to know which documents I should prepare for an initial consultation.",
      originalRequestPreview: "Which documents should I prepare for an initial consultation?",
      patient: { initials: "LW", kind: "verified", name: "Lukas Weber" },
      receivedLabel: "24 Aug, 10:45",
      revision: 4,
      timeline: [
        {
          authorName: "Sarah Schmidt",
          body: "Patient prefers a first assessment by message before scheduling a call.",
          createdAt: "2026-08-24T08:49:00.000Z",
          id: "note-lukas-1",
          kind: "internal-note",
          timeLabel: "24 Aug, 10:49",
        },
        {
          author: { kind: "clinic", label: "Clinic", staffName: "Dr Anna Keller" },
          body: "Hello Mr Weber, thank you for your interest. For an initial assessment we normally need photos of the affected areas.",
          createdAt: "2026-08-24T08:52:00.000Z",
          id: "message-lukas-1",
          kind: "external-message",
          timeLabel: "24 Aug, 10:52",
        },
        {
          attachment: syntheticAttachment,
          author: { kind: "patient", label: "Patient" },
          body: "Here are the requested photos. I hope they help.",
          createdAt: "2026-08-24T09:02:00.000Z",
          id: "message-lukas-2",
          kind: "external-message",
          timeLabel: "24 Aug, 11:02",
        },
      ],
      treatmentTimeline: "Within 3–6 months",
      unread: { count: 2, isUnread: true },
    },
    {
      actions: {
        canAddInternalNote: true,
        canChangeHandlingStatus: true,
        canChangeLifecycle: true,
        canMarkRead: true,
        canMarkUnread: false,
        canReply: false,
        canRevealContact: false,
      },
      changeCursor: "controlled-2",
      contact: { state: "collapsed" },
      contactWindow: "Mornings",
      conversation: { kind: "guest" },
      createdAt: "2026-08-24T08:12:00.000Z",
      handlingStatus: "submitted",
      id: "inquiry-aylin-kaya",
      interest: "Dental veneers and full smile reconstruction",
      lastActivityAt: "2026-08-24T08:18:00.000Z",
      lastActivityLabel: "24 Aug, 10:18",
      lastActivityPreview: "Review treatment fit now.",
      latestActivityKind: "internal-note",
      lifecycle: "open",
      originalRequest:
        "I would like to understand the consultation process for dental veneers and whether an initial estimate is possible.",
      originalRequestPreview: "I would like to understand the consultation process for dental veneers.",
      patient: { initials: "AK", kind: "guest", name: "Aylin Kaya" },
      receivedLabel: "24 Aug, 10:12",
      revision: 2,
      timeline: [
        {
          authorName: "Sarah Schmidt",
          body: "Guest inquiry. Review treatment fit now; wait for verified patient access before replying.",
          createdAt: "2026-08-24T08:18:00.000Z",
          id: "note-aylin-1",
          kind: "internal-note",
          timeLabel: "24 Aug, 10:18",
        },
      ],
      treatmentTimeline: "Within one month",
      unread: { count: 1, isUnread: true },
    },
    {
      actions: {
        canAddInternalNote: true,
        canChangeHandlingStatus: true,
        canChangeLifecycle: true,
        canMarkRead: false,
        canMarkUnread: true,
        canReply: false,
        canRevealContact: false,
      },
      changeCursor: "controlled-3",
      contact: { state: "collapsed" },
      contactWindow: "Any weekday",
      conversation: { id: "conversation-markus", kind: "bound" },
      createdAt: "2026-08-21T07:20:00.000Z",
      handlingStatus: "contacted",
      id: "inquiry-markus-schmidt",
      interest: "Rhinoplasty",
      lastActivityAt: "2026-08-21T13:07:00.000Z",
      lastActivityLabel: "21 Aug, 15:07",
      lastActivityPreview: "Conversation closed.",
      latestActivityKind: "system-event",
      lifecycle: "closed",
      originalRequest: "Could you tell me whether a consultation can be held remotely before I travel?",
      originalRequestPreview: "Can a consultation be held remotely before I travel?",
      patient: { initials: "MS", kind: "verified", name: "Markus Schmidt" },
      receivedLabel: "21 Aug, 09:20",
      revision: 3,
      timeline: [
        {
          actorName: "Sarah Schmidt",
          body: "Conversation closed.",
          createdAt: "2026-08-21T13:07:00.000Z",
          id: "event-markus-closed",
          kind: "system-event",
          timeLabel: "21 Aug, 15:07",
        },
      ],
      treatmentTimeline: "Within 6 months",
      unread: { count: 0, isUnread: false },
    },
    {
      actions: {
        canAddInternalNote: true,
        canChangeHandlingStatus: true,
        canChangeLifecycle: false,
        canMarkRead: false,
        canMarkUnread: true,
        canReply: false,
        canRevealContact: true,
      },
      changeCursor: "controlled-3",
      contact: { state: "masked" },
      contactWindow: "Unknown",
      conversation: { kind: "guest" },
      createdAt: "2026-08-08T06:11:00.000Z",
      handlingStatus: "spam",
      id: "inquiry-spam-sender",
      interest: "Unrelated promotion",
      lastActivityAt: "2026-08-08T06:14:00.000Z",
      lastActivityLabel: "8 Aug, 08:14",
      lastActivityPreview: "Marked as Spam and conversation closed.",
      latestActivityKind: "system-event",
      lifecycle: "closed",
      originalRequest: "Promotional content unrelated to patient care.",
      originalRequestPreview: "Promotional content unrelated to patient care.",
      patient: { initials: "?", kind: "guest", name: "Unknown sender" },
      receivedLabel: "8 Aug, 08:11",
      revision: 3,
      timeline: [
        {
          actorName: "Sarah Schmidt",
          body: "Marked as Spam and conversation closed.",
          createdAt: "2026-08-08T06:14:00.000Z",
          id: "event-spam",
          kind: "system-event",
          timeLabel: "8 Aug, 08:14",
        },
      ],
      treatmentTimeline: "Not applicable",
      unread: { count: 0, isUnread: false },
    },
  ]
}

function asSummary(detail: PatientInquiryDetail): PatientInquiry {
  return detail
}

function updateLastActivity(
  detail: PatientInquiryDetail,
  preview: string,
  kind: PatientInquiry["latestActivityKind"],
) {
  const now = "2026-08-24T10:08:00.000Z"
  return {
    ...detail,
    changeCursor: `controlled-${detail.revision + 1}`,
    lastActivityAt: now,
    lastActivityLabel: "24 Aug, 12:08",
    lastActivityPreview: preview,
    latestActivityKind: kind,
    revision: detail.revision + 1,
  }
}

type ControlledIdempotentResult = Readonly<{
  signature: string
  value: Readonly<{ inquiry: PatientInquiryDetail; replayed?: boolean }>
}>

type ControlledAttachmentDraft = Readonly<{
  body?: ArrayBuffer
  fileName: string
  finalized: boolean
  inquiryId: string
  mimeType: InquiryAttachmentContent["contentType"]
  sizeBytes: number
  uploaded: boolean
}>

type ControlledInquiryState = {
  attachmentBodies: Map<string, InquiryAttachmentContent>
  drafts: Map<string, ControlledAttachmentDraft>
  idempotentResults: Map<string, ControlledIdempotentResult>
  inquiries: PatientInquiryDetail[]
  nextDraftSequence: number
  priorHandlingStatus: Map<string, Exclude<InquiryHandlingStatus, "spam">>
}

function controlledStateByClinic() {
  const controlledGlobal = globalThis as typeof globalThis & {
    __clinicDashboardInquiryStateByClinic?: Map<string, ControlledInquiryState>
  }
  controlledGlobal.__clinicDashboardInquiryStateByClinic ??= new Map()
  return controlledGlobal.__clinicDashboardInquiryStateByClinic
}

function createControlledState(): ControlledInquiryState {
  const syntheticAttachmentBody = new TextEncoder().encode("synthetic attachment").buffer
  return {
    attachmentBodies: new Map([
      [syntheticAttachment.id, { body: syntheticAttachmentBody, contentType: syntheticAttachment.mimeType }],
    ]),
    drafts: new Map(),
    idempotentResults: new Map<string, ControlledIdempotentResult>(),
    inquiries: details(),
    nextDraftSequence: 1,
    priorHandlingStatus: new Map(),
  }
}

function controlledChangeCursor(value: string) {
  let hash = 2_166_136_261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }
  return `controlled-${(hash >>> 0).toString(36)}`
}

export function resetControlledPatientInquiryProvider(clinicId?: string) {
  if (clinicId) controlledStateByClinic().set(clinicId, createControlledState())
  else controlledStateByClinic().clear()
}

export function createControlledPatientInquiryAttachmentDraftUpload(
  clinicId = "controlled-clinic",
): PatientInquiryAttachmentDraftUpload {
  return async ({ body, draftId, mimeType }) => {
    const state = controlledStateByClinic().get(clinicId)
    const draft = state?.drafts.get(draftId)
    if (!state || !draft) return { error: { code: "not-found" }, ok: false }
    if (
      draft.finalized ||
      draft.mimeType !== mimeType ||
      draft.sizeBytes !== body.byteLength ||
      body.byteLength === 0
    ) {
      return { error: { code: "invalid-state" }, ok: false }
    }
    state.drafts.set(draftId, { ...draft, body: body.slice(0), uploaded: true })
    return { ok: true, value: { uploaded: true } }
  }
}

export function createControlledPatientInquiryProvider(
  clinicId = "controlled-clinic",
): PatientInquiryProvider {
  const stateByClinic = controlledStateByClinic()
  const state = stateByClinic.get(clinicId) ?? createControlledState()
  stateByClinic.set(clinicId, state)

  const find = (inquiryId: string) => state.inquiries.find((inquiry) => inquiry.id === inquiryId)
  const replace = (next: PatientInquiryDetail) => {
    state.inquiries = state.inquiries.map((inquiry) => (inquiry.id === next.id ? next : inquiry))
    return next
  }
  const missing = (): InquiryResult<never> => ({ error: { code: "not-found" }, ok: false })
  const conflict = (current: PatientInquiryDetail): InquiryResult<never> => ({
    error: { code: "conflict", current },
    ok: false,
  })

  return {
    async addInternalNote(input) {
      const idempotencyScope = `note:${input.inquiryId}:${input.idempotencyKey}`
      const signature = JSON.stringify({ text: input.text })
      const current = find(input.inquiryId)
      if (!current) return missing()
      const replay = state.idempotentResults.get(idempotencyScope)
      if (replay) {
        return replay.signature === signature
          ? { ok: true, value: { ...replay.value, replayed: true } }
          : conflict(current)
      }
      if (!current.actions.canAddInternalNote || !input.text.trim() || input.text.length > 3_000) {
        return { error: { code: "invalid-state", current }, ok: false }
      }
      const nextNoteIndex = current.timeline.length + 1
      const next = replace({
        ...current,
        changeCursor: `controlled-note-${current.id}-${nextNoteIndex}`,
        lastActivityAt: "2026-08-24T10:08:00.000Z",
        lastActivityLabel: "24 Aug, 12:08",
        lastActivityPreview: input.text,
        latestActivityKind: "internal-note",
        timeline: [
          ...current.timeline,
          {
            authorName: "Sarah Schmidt",
            body: input.text,
            createdAt: "2026-08-24T10:08:00.000Z",
            id: `note-${current.id}-${nextNoteIndex}`,
            kind: "internal-note",
            timeLabel: "24 Aug, 12:08",
          },
        ],
      })
      const value = { inquiry: next }
      state.idempotentResults.set(idempotencyScope, { signature, value })
      return { ok: true, value }
    },
    async changeReadPosition({ activityId, inquiryId, mode }) {
      const current = find(inquiryId)
      if (!current) return missing()
      if (mode === "read" ? !current.actions.canMarkRead : !current.actions.canMarkUnread) {
        return { error: { code: "invalid-state", current }, ok: false }
      }
      const unread =
        mode === "read"
          ? { count: 0, isUnread: false, ...(activityId ? { lastReadActivityId: activityId } : {}) }
          : { count: 1, isUnread: true, lastReadActivityId: current.unread.lastReadActivityId }
      replace({
        ...current,
        actions: {
          ...current.actions,
          canMarkRead: unread.isUnread,
          canMarkUnread: !unread.isUnread,
        },
        unread,
      })
      return { ok: true, value: { unread } }
    },
    async changeState(input) {
      const current = find(input.inquiryId)
      if (!current) return missing()
      if (current.revision !== input.expectedRevision) return conflict(current)
      if (
        (input.action === "set-handling-status" && !current.actions.canChangeHandlingStatus) ||
        ((input.action === "close" || input.action === "reopen" || input.action === "mark-spam") &&
          !current.actions.canChangeLifecycle) ||
        ((input.action === "mark-spam" || input.action === "remove-spam") &&
          !current.actions.canChangeHandlingStatus)
      ) {
        return { error: { code: "invalid-state", current }, ok: false }
      }
      if (
        input.action === "set-handling-status" &&
        !getInquiryHandlingStatusTargets(current.handlingStatus).some(
          (target) => target === input.handlingStatus,
        )
      ) {
        return { error: { code: "invalid-state", current }, ok: false }
      }

      let next: PatientInquiryDetail
      if (input.action === "set-handling-status") {
        next = updateLastActivity(current, "Inquiry status changed.", "system-event")
        next = { ...next, handlingStatus: input.handlingStatus }
      } else if (input.action === "close") {
        next = { ...updateLastActivity(current, "Conversation closed.", "system-event"), lifecycle: "closed" }
      } else if (input.action === "reopen") {
        next = { ...updateLastActivity(current, "Conversation reopened.", "system-event"), lifecycle: "open" }
      } else if (input.action === "mark-spam") {
        if (!input.reason?.trim()) return { error: { code: "invalid-input" }, ok: false }
        if (current.handlingStatus !== "spam") {
          state.priorHandlingStatus.set(current.id, current.handlingStatus)
        }
        next = {
          ...updateLastActivity(current, "Marked as Spam and conversation closed.", "system-event"),
          handlingStatus: "spam",
          lifecycle: "closed",
          unread: { count: 0, isUnread: false },
        }
      } else {
        next = {
          ...updateLastActivity(current, "Spam label removed. Conversation remains closed.", "system-event"),
          handlingStatus: state.priorHandlingStatus.get(current.id) ?? "submitted",
          lifecycle: "closed",
        }
      }
      const eventBody = next.lastActivityPreview
      next = {
        ...next,
        actions: {
          ...next.actions,
          canChangeLifecycle: next.handlingStatus !== "spam",
          canMarkRead: next.unread.isUnread,
          canMarkUnread: !next.unread.isUnread,
          canReply:
            next.conversation.kind === "bound" && next.lifecycle === "open" && next.handlingStatus !== "spam",
          canRevealContact: next.handlingStatus === "spam",
        },
        contact:
          next.handlingStatus === "spam"
            ? { state: "masked" }
            : next.lifecycle === "closed"
              ? { state: "collapsed" }
              : current.contact,
        timeline: [
          ...current.timeline,
          {
            actorName: "Sarah Schmidt",
            body: eventBody,
            createdAt: next.lastActivityAt,
            id: `event-${current.id}-${next.revision}`,
            kind: "system-event",
            timeLabel: next.lastActivityLabel,
          },
        ],
      }
      return { ok: true, value: { inquiry: replace(next) } }
    },
    async createAttachmentDraft({ fileName, inquiryId, mimeType, sizeBytes }) {
      const current = find(inquiryId)
      if (!current) return missing()
      if (!current.actions.canReply) return { error: { code: "invalid-state", current }, ok: false }
      if (
        mimeType !== "application/pdf" &&
        mimeType !== "image/jpeg" &&
        mimeType !== "image/png" &&
        mimeType !== "image/webp"
      ) {
        return { error: { code: "unsupported-media-type" }, ok: false }
      }
      const draftSequence = state.nextDraftSequence ?? state.drafts.size + 1
      state.nextDraftSequence = draftSequence + 1
      const draftId = `draft-${inquiryId}-${draftSequence}`
      state.drafts.set(draftId, {
        fileName,
        finalized: false,
        inquiryId,
        mimeType,
        sizeBytes,
        uploaded: false,
      })
      return {
        ok: true,
        value: {
          draftId,
          expiresAt: "2026-08-25T10:08:00.000Z",
          upload: {
            headers: { "content-type": mimeType },
            method: "PUT",
            url: `/api/dashboard/inquiries/attachments/drafts/upload?draftId=${encodeURIComponent(draftId)}`,
          },
        },
      }
    },
    async discardAttachmentDraft({ draftId, inquiryId }) {
      const draft = state.drafts.get(draftId)
      if (draft?.inquiryId === inquiryId) state.drafts.delete(draftId)
      return { ok: true, value: { discarded: Boolean(draft) } }
    },
    async downloadAttachment({ attachmentId }) {
      const attachment = state.attachmentBodies.get(attachmentId)
      return attachment ? { ok: true, value: attachment } : missing()
    },
    async finalizeAttachmentDraft({ draftId, inquiryId }) {
      const draft = state.drafts.get(draftId)
      if (!draft || draft.inquiryId !== inquiryId) return missing()
      if (!draft.uploaded || !draft.body) return { error: { code: "invalid-state" }, ok: false }
      state.drafts.set(draftId, { ...draft, finalized: true })
      return { ok: true, value: { finalized: true } }
    },
    async loadDetail({ inquiryId, knownChangeCursor }) {
      const inquiry = find(inquiryId)
      return inquiry
        ? {
            ok: true,
            value: {
              changeCursor: inquiry.changeCursor,
              inquiry,
              unchanged: knownChangeCursor === inquiry.changeCursor,
            },
          }
        : missing()
    },
    async loadQueue(input) {
      const query = input.query?.toLocaleLowerCase("en")
      const cursorMatch = input.cursor?.match(/^controlled-page:(\d+)$/u)
      if (input.cursor && !cursorMatch) return { error: { code: "invalid-input" }, ok: false }
      const unreadCount = state.inquiries.reduce(
        (total, inquiry) => total + (inquiry.unread.isUnread ? 1 : 0),
        0,
      )
      const changeCursor = controlledChangeCursor(
        JSON.stringify({
          cursor: input.cursor ?? null,
          clinicId,
          handlingStatus: input.handlingStatus ?? [],
          lifecycle: input.lifecycle,
          projection: state.inquiries.map(asSummary),
          query: query ?? null,
          unreadOnly: input.unreadOnly,
        }),
      )
      if (input.knownChangeCursor === changeCursor) {
        return {
          ok: true,
          value: {
            changeCursor,
            inquiries: [],
            status: "ready",
            unchanged: true,
            unreadCount,
          },
        }
      }
      const visible = state.inquiries
        .filter((inquiry) => input.lifecycle === "all" || inquiry.lifecycle === input.lifecycle)
        .filter(
          (inquiry) => !input.handlingStatus?.length || input.handlingStatus.includes(inquiry.handlingStatus),
        )
        .filter((inquiry) => !input.unreadOnly || inquiry.unread.isUnread)
        .filter(
          (inquiry) =>
            !query ||
            [
              inquiry.id,
              inquiry.interest,
              inquiry.originalRequest,
              inquiry.patient.name,
              ...inquiry.timeline.map((item) =>
                item.kind === "external-message" ? `${item.body} ${item.attachment?.name ?? ""}` : item.body,
              ),
            ]
              .join(" ")
              .toLocaleLowerCase("en")
              .includes(query),
        )
        .sort((left, right) => right.lastActivityAt.localeCompare(left.lastActivityAt))
      const offset = cursorMatch ? Number(cursorMatch[1]) : 0
      const page = visible.slice(offset, offset + 2)
      return {
        ok: true,
        value: {
          changeCursor,
          inquiries: page.map(asSummary),
          ...(offset + page.length < visible.length
            ? { nextCursor: `controlled-page:${offset + page.length}` }
            : {}),
          status: "ready",
          unchanged: false,
          unreadCount,
        },
      }
    },
    async previewAttachment({ attachmentId }) {
      const attachment = state.attachmentBodies.get(attachmentId)
      return attachment ? { ok: true, value: attachment } : missing()
    },
    async revealContact({ inquiryId }) {
      const current = find(inquiryId)
      if (!current) return missing()
      if (current.handlingStatus !== "spam" || !current.actions.canRevealContact) {
        return { error: { code: "invalid-state", current }, ok: false }
      }
      const next = {
        ...current,
        contact: {
          email: "protected.sender@example.test",
          phone: "+49 000 0000099",
          state: "full" as const,
        },
      }
      return { ok: true, value: { inquiry: next } }
    },
    async sendExternalMessage(input) {
      const idempotencyScope = `message:${input.inquiryId}:${input.idempotencyKey}`
      const signature = JSON.stringify({
        attachmentDraftId: input.attachmentDraftId ?? null,
        text: input.text ?? null,
      })
      const current = find(input.inquiryId)
      if (!current) return missing()
      const replay = state.idempotentResults.get(idempotencyScope)
      if (replay) {
        return replay.signature === signature
          ? { ok: true, value: { ...replay.value, replayed: true } }
          : conflict(current)
      }
      if (current.revision !== input.expectedRevision) return conflict(current)
      if (!current.actions.canReply || (!input.text?.trim() && !input.attachmentDraftId)) {
        return { error: { code: "invalid-state", current }, ok: false }
      }
      if (input.text && input.text.length > 3_000) return { error: { code: "invalid-input" }, ok: false }
      const attachmentDraft = input.attachmentDraftId ? state.drafts.get(input.attachmentDraftId) : undefined
      const attachmentBody = attachmentDraft?.body
      if (input.attachmentDraftId) {
        if (!attachmentDraft?.finalized || !attachmentBody || attachmentDraft.inquiryId !== current.id) {
          return { error: { code: "invalid-state", current }, ok: false }
        }
      }
      const body = input.text ?? ""
      const sentAttachmentId = attachmentDraft
        ? `attachment-${current.id}-${current.revision + 1}`
        : undefined
      const next = replace({
        ...updateLastActivity(current, body || "Attachment sent.", "external-message"),
        handlingStatus:
          current.handlingStatus === "submitted" || current.handlingStatus === "in_review"
            ? "contacted"
            : current.handlingStatus,
        timeline: [
          ...current.timeline,
          {
            ...(attachmentDraft && sentAttachmentId
              ? {
                  attachment: {
                    id: sentAttachmentId,
                    mimeType: attachmentDraft.mimeType,
                    name: attachmentDraft.fileName,
                    sizeBytes: attachmentDraft.sizeBytes,
                  },
                }
              : {}),
            author: { kind: "clinic", label: "Clinic", staffName: "Sarah Schmidt" },
            body,
            createdAt: "2026-08-24T10:08:00.000Z",
            id: `message-${current.id}-${current.revision + 1}`,
            kind: "external-message",
            timeLabel: "24 Aug, 12:08",
          },
        ],
      })
      if (attachmentDraft && attachmentBody && sentAttachmentId && input.attachmentDraftId) {
        state.attachmentBodies.set(sentAttachmentId, {
          body: attachmentBody,
          contentType: attachmentDraft.mimeType,
        })
        state.drafts.delete(input.attachmentDraftId)
      }
      const value = { inquiry: next }
      state.idempotentResults.set(idempotencyScope, { signature, value })
      return { ok: true, value }
    },
  }
}
