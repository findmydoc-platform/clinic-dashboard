import { beforeEach, describe, expect, it } from "vitest"
import {
  createControlledPatientInquiryProvider,
  resetControlledPatientInquiryProvider,
} from "@/features/clinic-dashboard/messages/server/controlled-inquiries"

describe("controlled patient inquiry provider", () => {
  beforeEach(() => resetControlledPatientInquiryProvider())
  it("paginates with opaque cursors and searches safe timeline fields", async () => {
    const provider = createControlledPatientInquiryProvider()
    const first = await provider.loadQueue({ lifecycle: "all", unreadOnly: false })
    if (!first.ok || first.value.status !== "ready") throw new Error("Expected first queue page")
    expect(first.value.inquiries).toHaveLength(2)
    expect(first.value.nextCursor).toBe("controlled-page:2")
    expect(first.value.unreadCount).toBe(2)

    const second = await provider.loadQueue({
      cursor: first.value.nextCursor,
      lifecycle: "all",
      unreadOnly: false,
    })
    expect(second.ok && second.value.inquiries).toHaveLength(2)

    const noteMatch = await provider.loadQueue({
      lifecycle: "all",
      query: "review treatment fit",
      unreadOnly: false,
    })
    expect(noteMatch.ok && noteMatch.value.inquiries.map(({ id }) => id)).toContain("inquiry-aylin-kaya")
    expect(noteMatch.ok && noteMatch.value.status === "ready" && noteMatch.value.unreadCount).toBe(
      first.value.unreadCount,
    )
    const contactSearch = await provider.loadQueue({
      lifecycle: "all",
      query: "protected.sender@example.test",
      unreadOnly: false,
    })
    expect(contactSearch.ok && contactSearch.value.inquiries).toEqual([])
  })

  it("returns an empty unchanged page only for the same request-bound queue cursor", async () => {
    const provider = createControlledPatientInquiryProvider("controlled-cursor-clinic")
    const first = await provider.loadQueue({ lifecycle: "open", unreadOnly: false })
    if (!first.ok || first.value.status !== "ready") throw new Error("Expected first queue page")

    const unchanged = await provider.loadQueue({
      knownChangeCursor: first.value.changeCursor,
      lifecycle: "open",
      unreadOnly: false,
    })
    expect(unchanged).toEqual({
      ok: true,
      value: {
        changeCursor: first.value.changeCursor,
        inquiries: [],
        status: "ready",
        unchanged: true,
        unreadCount: first.value.unreadCount,
      },
    })

    const differentFilter = await provider.loadQueue({
      knownChangeCursor: first.value.changeCursor,
      lifecycle: "closed",
      unreadOnly: false,
    })
    expect(
      differentFilter.ok && differentFilter.value.status === "ready" && differentFilter.value.unchanged,
    ).toBe(false)
  })

  it("replays the same message action but conflicts on key reuse with different content", async () => {
    const provider = createControlledPatientInquiryProvider()
    const detail = await provider.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    if (!detail.ok) throw new Error("Missing controlled inquiry")
    const input = {
      expectedRevision: detail.value.inquiry.revision,
      idempotencyKey: "message-action-0001",
      inquiryId: detail.value.inquiry.id,
      text: "Thanks for the update.",
    } as const

    const first = await provider.sendExternalMessage(input)
    expect(first.ok && first.value.inquiry.handlingStatus).toBe("contacted")
    const replay = await provider.sendExternalMessage(input)
    expect(replay.ok && replay.value.replayed).toBe(true)
    expect(replay.ok && replay.value.inquiry.timeline).toHaveLength(
      first.ok ? first.value.inquiry.timeline.length : 0,
    )

    const reused = await provider.sendExternalMessage({ ...input, text: "Different content" })
    expect(reused).toMatchObject({ error: { code: "conflict" }, ok: false })
  })

  it("allows the deliberate Contacted to In review correction but never targets Submitted", async () => {
    const provider = createControlledPatientInquiryProvider()
    const before = await provider.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    if (!before.ok) throw new Error("Missing controlled inquiry")
    expect(before.value.inquiry.handlingStatus).toBe("contacted")

    const corrected = await provider.changeState({
      action: "set-handling-status",
      expectedRevision: before.value.inquiry.revision,
      handlingStatus: "in_review",
      inquiryId: before.value.inquiry.id,
    })
    if (!corrected.ok) throw new Error("Expected deliberate handling correction")
    expect(corrected.value.inquiry.handlingStatus).toBe("in_review")

    await expect(
      provider.changeState({
        action: "set-handling-status",
        expectedRevision: corrected.value.inquiry.revision,
        handlingStatus: "submitted" as never,
        inquiryId: corrected.value.inquiry.id,
      }),
    ).resolves.toMatchObject({ error: { code: "invalid-state" }, ok: false })
  })

  it("keeps controlled mutation state isolated by the verified clinic scope", async () => {
    const firstClinic = createControlledPatientInquiryProvider("controlled-clinic-a")
    const secondClinic = createControlledPatientInquiryProvider("controlled-clinic-b")
    const firstDetail = await firstClinic.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    const secondDetail = await secondClinic.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    if (!firstDetail.ok || !secondDetail.ok) throw new Error("Missing controlled inquiry")

    await firstClinic.sendExternalMessage({
      expectedRevision: firstDetail.value.inquiry.revision,
      idempotencyKey: "clinic-isolation-message-0001",
      inquiryId: firstDetail.value.inquiry.id,
      text: "Visible only in clinic A.",
    })

    const rereadSecondClinic = await secondClinic.loadDetail({
      inquiryId: secondDetail.value.inquiry.id,
    })
    expect(rereadSecondClinic.ok && rereadSecondClinic.value.inquiry).toMatchObject({
      lastActivityPreview: secondDetail.value.inquiry.lastActivityPreview,
      revision: secondDetail.value.inquiry.revision,
    })
  })

  it("allows internal notes for guests but never external replies", async () => {
    const provider = createControlledPatientInquiryProvider()
    const detail = await provider.loadDetail({ inquiryId: "inquiry-aylin-kaya" })
    if (!detail.ok) throw new Error("Missing controlled inquiry")

    const reply = await provider.sendExternalMessage({
      expectedRevision: detail.value.inquiry.revision,
      idempotencyKey: "guest-message-0001",
      inquiryId: detail.value.inquiry.id,
      text: "This must not be sent.",
    })
    expect(reply).toMatchObject({ error: { code: "invalid-state" }, ok: false })

    const note = await provider.addInternalNote({
      idempotencyKey: "guest-note-0001",
      inquiryId: detail.value.inquiry.id,
      text: "Review internally.",
    })
    expect(note.ok && note.value.inquiry.timeline.at(-1)).toMatchObject({
      body: "Review internally.",
      kind: "internal-note",
    })
    expect(note.ok && note.value.inquiry.lastActivityPreview).toBe("Review internally.")
    expect(note.ok && note.value.inquiry.revision).toBe(detail.value.inquiry.revision)
  })

  it("allows revision-independent internal notes on closed and spam inquiries", async () => {
    const provider = createControlledPatientInquiryProvider()

    for (const [inquiryId, idempotencyKey] of [
      ["inquiry-markus-schmidt", "closed-note-0001"],
      ["inquiry-spam-sender", "spam-note-0001"],
    ] as const) {
      const before = await provider.loadDetail({ inquiryId })
      if (!before.ok) throw new Error("Missing controlled inquiry")
      const note = await provider.addInternalNote({
        idempotencyKey,
        inquiryId,
        text: "Internal follow-up remains allowed.",
      })
      expect(note.ok && note.value.inquiry.timeline.at(-1)).toMatchObject({
        body: "Internal follow-up remains allowed.",
        kind: "internal-note",
      })
      expect(note.ok && note.value.inquiry.revision).toBe(before.value.inquiry.revision)
    }
  })

  it("detects a new internal note through the detail change cursor without a revision change", async () => {
    const provider = createControlledPatientInquiryProvider()
    const before = await provider.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    if (!before.ok) throw new Error("Missing controlled inquiry")

    await provider.addInternalNote({
      idempotencyKey: "cursor-note-0001",
      inquiryId: before.value.inquiry.id,
      text: "Synthetic note changes the detail cursor.",
    })
    const after = await provider.loadDetail({
      inquiryId: before.value.inquiry.id,
      knownChangeCursor: before.value.changeCursor,
      knownRevision: before.value.inquiry.revision,
    })

    expect(after.ok && after.value.unchanged).toBe(false)
    expect(after.ok && after.value.changeCursor).not.toBe(before.value.changeCursor)
    expect(after.ok && after.value.inquiry.revision).toBe(before.value.inquiry.revision)
  })

  it("uses only the full detail change cursor to report an unchanged detail", async () => {
    const provider = createControlledPatientInquiryProvider()
    const before = await provider.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    if (!before.ok) throw new Error("Missing controlled inquiry")

    const revisionOnly = await provider.loadDetail({
      inquiryId: before.value.inquiry.id,
      knownRevision: before.value.inquiry.revision,
    })
    const fullMarker = await provider.loadDetail({
      inquiryId: before.value.inquiry.id,
      knownChangeCursor: before.value.changeCursor,
      knownRevision: before.value.inquiry.revision,
    })

    expect(revisionOnly.ok && revisionOnly.value.unchanged).toBe(false)
    expect(fullMarker.ok && fullMarker.value.unchanged).toBe(true)
  })

  it("removes spam without reopening and reveals contacts only for that explicit read", async () => {
    const provider = createControlledPatientInquiryProvider()
    const spam = await provider.loadDetail({ inquiryId: "inquiry-spam-sender" })
    if (!spam.ok) throw new Error("Missing controlled spam inquiry")
    expect(spam.value.inquiry.contact).toEqual({ state: "masked" })
    expect(spam.value.inquiry.actions.canChangeLifecycle).toBe(false)

    const revealed = await provider.revealContact({ inquiryId: spam.value.inquiry.id })
    expect(revealed.ok && revealed.value.inquiry.contact.state).toBe("full")
    const reread = await provider.loadDetail({ inquiryId: spam.value.inquiry.id })
    expect(reread.ok && reread.value.inquiry.contact).toEqual({ state: "masked" })

    const removed = await provider.changeState({
      action: "remove-spam",
      expectedRevision: spam.value.inquiry.revision,
      inquiryId: spam.value.inquiry.id,
    })
    expect(removed.ok && removed.value.inquiry).toMatchObject({
      handlingStatus: "submitted",
      lifecycle: "closed",
    })
  })

  it("tracks read position without changing the inquiry revision", async () => {
    const provider = createControlledPatientInquiryProvider()
    const before = await provider.loadDetail({ inquiryId: "inquiry-lukas-weber" })
    if (!before.ok) throw new Error("Missing controlled inquiry")
    const read = await provider.changeReadPosition({
      activityId: "message-lukas-2",
      inquiryId: before.value.inquiry.id,
      mode: "read",
    })
    expect(read).toEqual({
      ok: true,
      value: { unread: { count: 0, isUnread: false, lastReadActivityId: "message-lukas-2" } },
    })
    const after = await provider.loadDetail({ inquiryId: before.value.inquiry.id })
    expect(after.ok && after.value.inquiry.revision).toBe(before.value.inquiry.revision)
  })
})
