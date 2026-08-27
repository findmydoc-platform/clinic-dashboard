import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPayloadPatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/payload-inquiries"

function upstreamDetail(overrides: Record<string, unknown> = {}) {
  return {
    actions: {
      canAddInternalNote: true,
      canChangeHandlingStatus: true,
      canChangeLifecycle: true,
      canMarkRead: true,
      canMarkUnread: false,
      canReply: true,
      canRevealContact: false,
      canView: true,
    },
    attachmentConstraints: {
      acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
      maxFileBytes: 5 * 1024 * 1024,
      maxFilesPerMessage: 1,
    },
    binding: {
      canReply: true,
      conversationId: "conversation-1",
      kind: "patient",
      patient: { displayName: "Lukas Weber", id: "patient-1" },
    },
    contact: { email: "patient@example.test", mode: "full", phoneNumber: "+49 000 0000000" },
    createdAt: "2026-08-24T08:00:00.000Z",
    handlingStatus: "submitted",
    id: "inquiry-1",
    interest: {
      doctorId: "doctor-1",
      label: "Hair transplant",
      preferredContactWindow: "Weekdays",
      treatmentId: "treatment-1",
      treatmentTimeline: "Within three months",
    },
    lastActivityAt: "2026-08-24T09:00:00.000Z",
    latestActivityKind: "system-event",
    lifecycle: "open",
    originalRequest: {
      message: "I would like an initial assessment.",
      preferredContactWindow: "Weekdays",
      treatmentTimeline: "Within three months",
    },
    patientName: "Lukas Weber",
    preview: "Safe preview",
    revision: 7,
    timeline: [
      {
        actor: { displayName: "Sarah Schmidt", isCurrentActor: true, kind: "clinic" },
        createdAt: "2026-08-24T09:00:00.000Z",
        event: "handling-status-changed",
        id: "event-1",
        kind: "system-event",
      },
      {
        actor: { displayName: "Lukas Weber", isCurrentActor: false, kind: "patient" },
        attachment: {
          fileName: "assessment.pdf",
          id: "attachment-1",
          mimeType: "application/pdf",
          sizeBytes: 200,
        },
        createdAt: "2026-08-24T09:01:00.000Z",
        id: "message-1",
        kind: "external-message",
      },
    ],
    unread: { count: 1, isUnread: true },
    ...overrides,
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("Payload patient inquiry provider", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("maps authoritative interest, activity and actions without sending clinic or actor input", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        changeCursor: "change-7",
        items: [upstreamDetail()],
        nextCursor: "opaque-2",
        unchanged: false,
        unreadCount: 41,
      }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    const result = await provider.loadQueue({
      cursor: "opaque-1",
      handlingStatus: ["submitted", "in_review"],
      lifecycle: "all",
      knownChangeCursor: "queue-change-marker-1",
      query: "assessment",
      unreadOnly: true,
    })

    expect(result.ok && result.value.inquiries[0]).toMatchObject({
      interest: "Hair transplant",
      latestActivityKind: "system-event",
      revision: 7,
    })
    expect(result.ok && result.value.status === "ready" && result.value.unreadCount).toBe(41)
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toContain(
      "/api/clinic-dashboard/inquiries?lifecycle=all&limit=25&unreadOnly=true&cursor=opaque-1&knownChangeCursor=queue-change-marker-1&handlingStatus=submitted%2Cin_review&query=assessment",
    )
    expect(new URL(String(url)).searchParams.has("clinicId")).toBe(false)
    expect(init?.headers).toMatchObject({ Authorization: "Bearer verified-token" })
  })

  it("opts every inquiry upstream request into the communication contract", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { code: "INQUIRY_SERVICE_UNAVAILABLE" } }, 503),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    await Promise.all([
      provider.addInternalNote({
        idempotencyKey: "note-action-0001",
        inquiryId: "inquiry-1",
        text: "Synthetic note",
      }),
      provider.changeReadPosition({ inquiryId: "inquiry-1", mode: "read" }),
      provider.changeState({ action: "close", expectedRevision: 1, inquiryId: "inquiry-1" }),
      provider.createAttachmentDraft({
        fileName: "scan.pdf",
        inquiryId: "inquiry-1",
        mimeType: "application/pdf",
        sizeBytes: 3,
      }),
      provider.discardAttachmentDraft({ draftId: "draft-1", inquiryId: "inquiry-1" }),
      provider.downloadAttachment({ attachmentId: "attachment-1" }),
      provider.finalizeAttachmentDraft({ draftId: "draft-1", inquiryId: "inquiry-1" }),
      provider.loadDetail({ inquiryId: "inquiry-1" }),
      provider.loadQueue({ lifecycle: "open", unreadOnly: false }),
      provider.previewAttachment({ attachmentId: "attachment-1" }),
      provider.revealContact({ inquiryId: "inquiry-1" }),
      provider.sendExternalMessage({
        expectedRevision: 1,
        idempotencyKey: "message-action-0001",
        inquiryId: "inquiry-1",
        text: "Synthetic reply",
      }),
    ])

    expect(fetcher).toHaveBeenCalledTimes(12)
    for (const [url, init] of fetcher.mock.calls) {
      expect(new URL(String(url)).pathname).toMatch(/^\/api\/clinic-dashboard\/inquiries(?:\/|$)/u)
      const headers = new Headers(init?.headers)
      expect(headers.get("authorization")).toBe("Bearer verified-token")
      expect(headers.get("x-findmydoc-clinic-dashboard-contract")).toBe("inquiry-communication-v2")
    }
  })

  it("maps system actors and attachment-only messages without transport paths", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ changeCursor: "change-7", inquiry: upstreamDetail(), unchanged: false }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)
    const result = await provider.loadDetail({ inquiryId: "inquiry-1" })
    if (!result.ok) throw new Error("Expected inquiry detail")

    expect(result.value.inquiry.timeline[0]).toMatchObject({
      actorName: "Sarah Schmidt",
      kind: "system-event",
    })
    expect(result.value.inquiry.timeline[1]).toMatchObject({
      attachment: {
        id: "attachment-1",
        name: "assessment.pdf",
      },
      body: "",
      kind: "external-message",
    })
    const attachmentItem = result.value.inquiry.timeline[1]
    if (attachmentItem?.kind !== "external-message") throw new Error("Expected attachment message")
    expect(attachmentItem.attachment).not.toHaveProperty("downloadPath")
    expect(attachmentItem.attachment).not.toHaveProperty("previewPath")
  })

  it.each([
    ["moderation-restricted", "findmydoc restricted communication."],
    ["moderation-restored", "findmydoc restored communication."],
    ["legacy-closed-migrated", "Legacy closed inquiry migrated."],
  ] as const)("maps the v2 %s system event", async (event, body) => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        changeCursor: "change-8",
        inquiry: upstreamDetail({
          timeline: [
            {
              actor: { displayName: "findmydoc", isCurrentActor: false, kind: "system" },
              createdAt: "2026-08-24T09:02:00.000Z",
              event,
              id: `event-${event}`,
              kind: "system-event",
            },
          ],
        }),
        unchanged: false,
      }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    const result = await provider.loadDetail({ inquiryId: "inquiry-1" })

    expect(result.ok && result.value.inquiry.timeline[0]).toMatchObject({ body, kind: "system-event" })
  })

  it("preserves v2 moderation states for restricted messages and attachments", async () => {
    const moderation = {
      appeal: { caseId: "case-1", state: "available" },
      category: "privacy-concern",
      isCurrentActorAffected: true,
    }
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        changeCursor: "change-9",
        inquiry: upstreamDetail({
          timeline: [
            {
              actor: { displayName: "Lukas Weber", isCurrentActor: false, kind: "patient" },
              attachmentModeration: moderation,
              attachmentState: "restricted",
              contentState: "restricted",
              createdAt: "2026-08-24T09:03:00.000Z",
              id: "message-2",
              kind: "external-message",
              moderation,
            },
          ],
        }),
        unchanged: false,
      }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    const result = await provider.loadDetail({ inquiryId: "inquiry-1" })

    expect(result.ok && result.value.inquiry.timeline[0]).toMatchObject({
      attachmentModeration: moderation,
      attachmentState: "restricted",
      body: "",
      contentState: "restricted",
      kind: "external-message",
      moderation,
    })
  })

  it("projects deleted identities and package tombstones without restoring names or content", async () => {
    const deleted = upstreamDetail({
      actions: {
        canAddInternalNote: false,
        canChangeHandlingStatus: false,
        canChangeLifecycle: false,
        canMarkRead: false,
        canMarkUnread: false,
        canReply: false,
        canRevealContact: false,
        canView: true,
      },
      binding: { canReply: false, conversationId: "conversation-deleted", kind: "deleted-patient" },
      contact: { mode: "unavailable" },
      originalRequest: { contentState: "hard-deleted" },
      patientName: "Deleted patient",
      preview: "Message deleted",
      timeline: [
        {
          actor: { displayName: "", isCurrentActor: false, kind: "patient" },
          contentState: "hard-deleted",
          createdAt: "2026-08-24T09:03:00.000Z",
          id: "message-deleted",
          kind: "external-message",
        },
        {
          actor: { displayName: "", isCurrentActor: false, kind: "clinic" },
          contentState: "hard-deleted",
          createdAt: "2026-08-24T09:04:00.000Z",
          id: "note-deleted",
          kind: "internal-note",
        },
      ],
    })
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ changeCursor: "change-deleted", inquiry: deleted, unchanged: false }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    const result = await provider.loadDetail({ inquiryId: "inquiry-1" })

    expect(result.ok && result.value.inquiry).toMatchObject({
      contact: { state: "unavailable" },
      conversation: { id: "conversation-deleted", kind: "deleted-patient" },
      originalRequestContentState: "hard-deleted",
      patient: { kind: "deleted", name: "Deleted patient" },
    })
    expect(result.ok && result.value.inquiry).not.toHaveProperty("originalRequest")
    expect(result.ok && result.value.inquiry.timeline).toEqual([
      expect.objectContaining({ body: "", contentState: "hard-deleted", kind: "external-message" }),
      expect.objectContaining({ contentState: "hard-deleted", kind: "internal-note" }),
    ])
    expect(JSON.stringify(result)).not.toContain("Lukas Weber")
    expect(JSON.stringify(result)).not.toContain("patient@example.test")
  })

  it("forwards the known detail change cursor without clinic or actor query fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ changeCursor: "change-7", inquiry: upstreamDetail(), unchanged: true }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    await provider.loadDetail({ inquiryId: "inquiry-1", knownChangeCursor: "detail.change~6" })

    const endpoint = new URL(String(fetcher.mock.calls[0]?.[0]))
    expect(endpoint.searchParams.get("knownChangeCursor")).toBe("detail.change~6")
    expect(endpoint.searchParams.has("clinicId")).toBe(false)
    expect(endpoint.searchParams.has("actorId")).toBe(false)
  })

  it("forwards state changes without actor, clinic or idempotency fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ inquiry: upstreamDetail({ handlingStatus: "in_review", revision: 8 }) }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)
    await provider.changeState({
      action: "set-handling-status",
      expectedRevision: 7,
      handlingStatus: "in_review",
      inquiryId: "inquiry-1",
    })

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(body).toEqual({
      action: "set-handling-status",
      expectedRevision: 7,
      handlingStatus: "in_review",
      inquiryId: "inquiry-1",
    })
    expect(body).not.toHaveProperty("clinicId")
    expect(body).not.toHaveProperty("actorId")
    expect(body).not.toHaveProperty("idempotencyKey")
  })

  it("forwards internal notes without a root revision", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ inquiry: upstreamDetail() }))
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)
    await provider.addInternalNote({
      idempotencyKey: "note-action-0001",
      inquiryId: "inquiry-1",
      text: "  Preserve this plain text exactly.  ",
    })

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      idempotencyKey: "note-action-0001",
      inquiryId: "inquiry-1",
      text: "  Preserve this plain text exactly.  ",
    })
  })

  it("normalizes AbortError to a service timeout", async () => {
    const error = Object.assign(new Error("aborted"), { name: "AbortError" })
    const fetcher = vi.fn<typeof fetch>(async () => Promise.reject(error))
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    await expect(provider.loadDetail({ inquiryId: "inquiry-1" })).resolves.toEqual({
      error: { code: "service-timeout" },
      ok: false,
    })
  })

  it("contains malformed upstream projections in the safe error union", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        changeCursor: "change-7",
        items: [upstreamDetail({ lastActivityAt: "not-a-timestamp" })],
      }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    await expect(provider.loadQueue({ lifecycle: "open", unreadOnly: false })).resolves.toEqual({
      error: { code: "service-unavailable" },
      ok: false,
    })
  })

  it("proxies only bounded private attachment bytes and ignores malicious upstream disposition", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: {
            "cache-control": "private, no-store",
            "content-disposition": 'attachment; filename="../../evil.pdf"',
            "content-length": "3",
            "content-type": "application/pdf",
            location: "https://evil.example",
          },
        }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)
    const result = await provider.downloadAttachment({ attachmentId: "attachment-1" })

    expect(result.ok && result.value.contentType).toBe("application/pdf")
    expect(result.ok && [...new Uint8Array(result.value.body)]).toEqual([1, 2, 3])
    expect(result.ok && result.value).not.toHaveProperty("location")
  })

  it("rejects executable or publicly cacheable attachment responses", async () => {
    for (const headers of [
      { "cache-control": "private, no-store", "content-type": "text/html" },
      { "cache-control": "public, max-age=3600", "content-type": "application/pdf" },
    ]) {
      const fetcher = vi.fn<typeof fetch>(async () => new Response("unsafe", { headers }))
      const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)
      await expect(provider.previewAttachment({ attachmentId: "attachment-1" })).resolves.toEqual({
        error: { code: "service-unavailable" },
        ok: false,
      })
    }
  })

  it("rejects hostile upload headers before they reach the browser", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        draftId: "draft-1",
        expiresAt: "2026-08-25T00:00:00.000Z",
        upload: {
          headers: {
            authorization: "Bearer attacker-controlled",
            "content-type": "application/pdf",
          },
          method: "PUT",
          url: "https://uploads.example.test/draft-1",
        },
      }),
    )
    const provider = createPayloadPatientInquiryProvider("verified-token", "verified-clinic", fetcher)

    await expect(
      provider.createAttachmentDraft({
        fileName: "scan.pdf",
        inquiryId: "inquiry-1",
        mimeType: "application/pdf",
        sizeBytes: 3,
      }),
    ).resolves.toEqual({ error: { code: "service-unavailable" }, ok: false })
  })
})
