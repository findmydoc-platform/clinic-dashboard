import { describe, expect, it } from "vitest"
import {
  createInquiryQueueState,
  hasUnsavedInquiryDrafts,
  inquiryQueueReducer,
} from "@/features/clinic-dashboard/messages/model/inquiry-queue.reducer"
import { selectInquiryQueueViewModel } from "@/features/clinic-dashboard/messages/model/inquiry-queue.selectors"
import { getInquiryHandlingStatusTargets } from "@/features/clinic-dashboard/messages/model/inquiries"
import { createInquiryDetail, createInquirySnapshot } from "../support/inquiries"

describe("inquiry queue state", () => {
  it("never offers Submitted after intake and otherwise keeps handling progress monotone", () => {
    expect(getInquiryHandlingStatusTargets("submitted")).toEqual(["in_review", "contacted"])
    expect(getInquiryHandlingStatusTargets("in_review")).toEqual(["contacted"])
    expect(getInquiryHandlingStatusTargets("contacted")).toEqual(["in_review"])
    expect(getInquiryHandlingStatusTargets("spam")).toEqual([])
  })

  it("starts without selecting the first desktop item", () => {
    const model = selectInquiryQueueViewModel(
      createInquiryQueueState(createInquirySnapshot(undefined, { unreadCount: 17 })),
    )
    expect(model.selectedInquiry).toBeUndefined()
    expect(model.selectedInquiryId).toBeUndefined()
    expect(model.mobileDetailOpen).toBe(false)
    expect(model.totalUnreadCount).toBe(17)
  })

  it("keeps server-side full-text matches absent from the queue preview", () => {
    const searched = inquiryQueueReducer(createInquiryQueueState(createInquirySnapshot()), {
      query: "attachment-only-term",
      type: "searchQueryChanged",
    })
    expect(selectInquiryQueueViewModel(searched).visibleInquiries).toHaveLength(1)
  })

  it("supports multi-select handling filters and a separate spam view", () => {
    const inReview = createInquiryDetail({ handlingStatus: "in_review", id: "inquiry-2" })
    const spam = createInquiryDetail({
      handlingStatus: "spam",
      id: "inquiry-spam",
      lifecycle: "closed",
    })
    let state = createInquiryQueueState(createInquirySnapshot([createInquiryDetail(), inReview, spam]))
    state = inquiryQueueReducer(state, {
      statuses: ["submitted", "in_review"],
      type: "handlingStatusFilterChanged",
    })
    expect(selectInquiryQueueViewModel(state).visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual([
      "inquiry-1",
      "inquiry-2",
    ])
    state = inquiryQueueReducer(state, { filter: "spam", type: "primaryFilterChanged" })
    expect(selectInquiryQueueViewModel(state).visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual([
      "inquiry-spam",
    ])
  })

  it("gates replies with server actions and keeps note and reply drafts separate", () => {
    const detail = createInquiryDetail({
      actions: { ...createInquiryDetail().actions, canReply: false },
    })
    let state = createInquiryQueueState(createInquirySnapshot([detail]))
    state = inquiryQueueReducer(state, { inquiryId: detail.id, type: "inquiryLoadStarted" })
    state = inquiryQueueReducer(state, { inquiry: detail, type: "inquiryLoadSucceeded" })
    state = inquiryQueueReducer(state, {
      inquiryId: detail.id,
      mode: "note",
      type: "draftChanged",
      value: "Internal only",
    })
    state = inquiryQueueReducer(state, {
      inquiryId: detail.id,
      mode: "reply",
      type: "draftChanged",
      value: "Patient reply",
    })

    const model = selectInquiryQueueViewModel(state)
    expect(model.activeComposerMode).toBe("note")
    expect(model.draft).toBe("Internal only")
    expect(model.hasPendingReplyDraft).toBe(true)
    expect(model.hasUnsavedDrafts).toBe(true)
    expect(hasUnsavedInquiryDrafts(state)).toBe(true)
  })

  it("projects safe conflict state immediately and converts a blocked reply only on explicit action", () => {
    const original = createInquiryDetail()
    const current = createInquiryDetail({
      actions: { ...original.actions, canReply: false },
      lifecycle: "closed",
      revision: 2,
    })
    let state = createInquiryQueueState(createInquirySnapshot([original]))
    state = inquiryQueueReducer(state, { inquiryId: original.id, type: "inquiryLoadStarted" })
    state = inquiryQueueReducer(state, { inquiry: original, type: "inquiryLoadSucceeded" })
    state = inquiryQueueReducer(state, {
      inquiryId: original.id,
      mode: "reply",
      type: "draftChanged",
      value: "Keep this exact synthetic reply.",
    })
    state = inquiryQueueReducer(state, {
      conflict: { current, message: "Changed elsewhere." },
      message: "Changed elsewhere.",
      type: "mutationFailed",
    })

    let model = selectInquiryQueueViewModel(state)
    expect(model.selectedInquiry).toMatchObject({ lifecycle: "closed", revision: 2 })
    expect(state.inquiries[0]).toMatchObject({ lifecycle: "closed", revision: 2 })
    expect(model.blockedReplyDraft).toBe("Keep this exact synthetic reply.")
    expect(model.draft).toBe("")

    state = inquiryQueueReducer(state, { inquiryId: original.id, type: "replyDraftConvertedToNote" })
    model = selectInquiryQueueViewModel(state)
    expect(model.activeComposerMode).toBe("note")
    expect(model.draft).toBe("Keep this exact synthetic reply.")
    expect(model.blockedReplyDraft).toBeUndefined()
  })

  it("keeps blocked reply text and attachment visible while the internal-note composer stays isolated", () => {
    const original = createInquiryDetail()
    const closed = createInquiryDetail({
      actions: { ...original.actions, canReply: false },
      lifecycle: "closed",
      revision: original.revision + 1,
    })
    const attachment = {
      draftId: "draft-blocked-1",
      expiresAt: "2026-08-25T00:00:00.000Z",
      fileName: "synthetic-scan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120,
      status: "ready" as const,
    }
    let state = createInquiryQueueState(createInquirySnapshot([original]))
    state = inquiryQueueReducer(state, { inquiryId: original.id, type: "inquiryLoadStarted" })
    state = inquiryQueueReducer(state, { inquiry: original, type: "inquiryLoadSucceeded" })
    state = inquiryQueueReducer(state, {
      inquiryId: original.id,
      mode: "reply",
      type: "draftChanged",
      value: "Keep this blocked reply visible.",
    })
    state = inquiryQueueReducer(state, { attachment, inquiryId: original.id, type: "attachmentChanged" })
    state = inquiryQueueReducer(state, { mode: "note", type: "composerModeChanged" })
    state = inquiryQueueReducer(state, { inquiry: closed, type: "backgroundRefreshSucceeded" })

    const model = selectInquiryQueueViewModel(state)
    expect(model.activeComposerMode).toBe("note")
    expect(model.attachment).toBeUndefined()
    expect(model.blockedReplyDraft).toBe("Keep this blocked reply visible.")
    expect(model.blockedReplyAttachment).toEqual(attachment)
    expect(model.hasUnsavedDrafts).toBe(true)
  })

  it("updates the global unread count from a personal read-position delta", () => {
    const inquiry = createInquiryDetail({ unread: { count: 2, isUnread: true } })
    let state = createInquiryQueueState(createInquirySnapshot([inquiry], { unreadCount: 12 }))
    state = inquiryQueueReducer(state, {
      inquiryId: inquiry.id,
      type: "readPositionChanged",
      unread: { count: 0, isUnread: false },
    })

    expect(selectInquiryQueueViewModel(state).totalUnreadCount).toBe(11)
  })

  it("projects one unread inquiry for a safe conflict snapshot regardless of activity count", () => {
    const original = createInquiryDetail({ unread: { count: 0, isUnread: false } })
    const current = createInquiryDetail({ revision: 2, unread: { count: 7, isUnread: true } })
    const state = inquiryQueueReducer(
      createInquiryQueueState(createInquirySnapshot([original], { unreadCount: 12 })),
      {
        conflict: { current, message: "Changed elsewhere." },
        message: "Changed elsewhere.",
        type: "mutationFailed",
      },
    )

    expect(selectInquiryQueueViewModel(state).totalUnreadCount).toBe(13)
  })

  it("purges detail, drafts and attachments after final access loss", () => {
    const detail = createInquiryDetail({ unread: { count: 5, isUnread: true } })
    let state = createInquiryQueueState(createInquirySnapshot([detail], { unreadCount: 12 }))
    state = inquiryQueueReducer(state, { inquiryId: detail.id, type: "inquiryLoadStarted" })
    state = inquiryQueueReducer(state, { inquiry: detail, type: "inquiryLoadSucceeded" })
    state = inquiryQueueReducer(state, {
      inquiryId: detail.id,
      mode: "reply",
      type: "draftChanged",
      value: "Unsaved",
    })
    state = inquiryQueueReducer(state, {
      attachment: {
        draftId: "draft-1",
        expiresAt: "2026-08-25T00:00:00.000Z",
        fileName: "scan.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
        status: "ready",
      },
      inquiryId: detail.id,
      type: "attachmentChanged",
    })
    state = inquiryQueueReducer(state, {
      inquiryId: detail.id,
      message: "Access ended",
      type: "inquiryAccessLost",
    })

    expect(state.selectedInquiryId).toBeUndefined()
    expect(state.details).toEqual({})
    expect(state.drafts).toEqual({})
    expect(state.attachments).toEqual({})
    expect(state.inquiries).toEqual([])
    expect(state.unreadCount).toBe(11)
  })

  it("purges every protected projection and conflict snapshot when the session ends", () => {
    const detail = createInquiryDetail()
    let state = createInquiryQueueState(createInquirySnapshot([detail]))
    state = inquiryQueueReducer(state, { inquiryId: detail.id, type: "inquiryLoadStarted" })
    state = inquiryQueueReducer(state, { inquiry: detail, type: "inquiryLoadSucceeded" })
    state = inquiryQueueReducer(state, {
      inquiryId: detail.id,
      mode: "note",
      type: "draftChanged",
      value: "Protected draft",
    })
    state = inquiryQueueReducer(state, {
      conflict: { current: detail, message: "Changed" },
      message: "Changed",
      type: "mutationFailed",
    })

    state = inquiryQueueReducer(state, { message: "Session ended", type: "sessionLost" })

    expect(state).toMatchObject({
      attachments: {},
      availability: "temporarily-unavailable",
      details: {},
      drafts: {},
      inquiries: [],
    })
    expect(state.conflict).toBeUndefined()
    expect(state.selectedInquiryId).toBeUndefined()
  })

  it("deduplicates appended cursor pages", () => {
    const first = createInquiryDetail()
    const second = createInquiryDetail({ id: "inquiry-2", lastActivityAt: "2026-08-24T08:00:00.000Z" })
    let state = createInquiryQueueState(createInquirySnapshot([first], { nextCursor: "cursor-2" }))
    state = inquiryQueueReducer(state, {
      mode: "append",
      snapshot: createInquirySnapshot([first, second]),
      type: "queueLoaded",
    })
    expect(state.inquiries.map(({ id }) => id)).toEqual(["inquiry-1", "inquiry-2"])
  })
})
