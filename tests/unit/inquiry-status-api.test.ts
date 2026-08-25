// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createInquiryWorkspaceApiCommands } from "@/features/clinic-dashboard/messages/browser/inquiry-status-api"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("inquiry workspace browser API", () => {
  beforeEach(() => {
    document.cookie = "clinic_dashboard_csrf=test-csrf-token; path=/"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("loads server-filtered pages through same-origin URLs without clinic input", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        changeCursor: "change-1",
        inquiries: [],
        status: "ready",
        unchanged: false,
        unreadCount: 9,
      }),
    )
    vi.stubGlobal("fetch", fetcher)
    const commands = createInquiryWorkspaceApiCommands()

    const result = await commands.loadQueue({
      cursor: "opaque-2",
      handlingStatus: ["submitted", "in_review"],
      lifecycle: "all",
      knownChangeCursor: "queue-change-marker-1",
      query: "attachment match",
      unreadOnly: false,
    })

    const target = String(fetcher.mock.calls[0]?.[0])
    expect(target).toBe(
      "/api/dashboard/inquiries?lifecycle=all&unreadOnly=false&cursor=opaque-2&knownChangeCursor=queue-change-marker-1&handlingStatus=submitted%2Cin_review&query=attachment+match",
    )
    expect(target).not.toContain("clinicId")
    expect(result).toMatchObject({ ok: true, value: { unreadCount: 9 } })
  })

  it("keeps a safe current snapshot on conflict responses", async () => {
    const current = {
      actions: {
        canAddInternalNote: true,
        canChangeHandlingStatus: true,
        canChangeLifecycle: true,
        canMarkRead: false,
        canMarkUnread: true,
        canReply: false,
        canRevealContact: false,
      },
      changeCursor: "change-2",
      contact: { state: "collapsed" },
      contactWindow: "Weekdays",
      conversation: { id: "conversation-1", kind: "bound" },
      createdAt: "2026-08-24T08:00:00.000Z",
      handlingStatus: "contacted",
      id: "inquiry-1",
      interest: "Hair transplant",
      lastActivityAt: "2026-08-24T09:00:00.000Z",
      lastActivityLabel: "24 Aug, 11:00",
      lastActivityPreview: "Conversation closed.",
      latestActivityKind: "system-event",
      lifecycle: "closed",
      originalRequest: "Synthetic request",
      originalRequestPreview: "Synthetic request",
      patient: { initials: "LW", kind: "verified", name: "Lukas Weber" },
      receivedLabel: "24 Aug, 10:00",
      revision: 2,
      timeline: [],
      treatmentTimeline: "Within three months",
      unread: { count: 0, isUnread: false },
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { code: "conflict", current } }, 409)),
    )

    await expect(
      createInquiryWorkspaceApiCommands().sendExternalMessage({
        expectedRevision: 1,
        idempotencyKey: "reply-action-0001",
        inquiryId: "inquiry-1",
        text: "Synthetic reply",
      }),
    ).resolves.toEqual({ error: { code: "conflict", current }, ok: false })
  })

  it("adds CSRF but never actor or clinic fields to state mutations", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ error: { code: "invalid-state" } }, 422))
    vi.stubGlobal("fetch", fetcher)
    const commands = createInquiryWorkspaceApiCommands()
    await commands.changeState({
      action: "close",
      expectedRevision: 4,
      inquiryId: "inquiry-1",
      reason: "Resolved",
    })

    const init = fetcher.mock.calls[0]?.[1]
    expect(init?.headers).toMatchObject({ "x-csrf-token": "test-csrf-token" })
    expect(JSON.parse(String(init?.body))).toEqual({
      action: "close",
      expectedRevision: 4,
      inquiryId: "inquiry-1",
      reason: "Resolved",
    })
  })

  it("sends internal notes without a root revision", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ error: { code: "invalid-state" } }, 422))
    vi.stubGlobal("fetch", fetcher)
    await createInquiryWorkspaceApiCommands().addInternalNote({
      idempotencyKey: "note-action-0001",
      inquiryId: "inquiry-1",
      text: "  Keep exact plain text.  ",
    })

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      idempotencyKey: "note-action-0001",
      inquiryId: "inquiry-1",
      text: "  Keep exact plain text.  ",
    })
  })

  it("uploads one safe draft directly and finalizes it before exposing ready state", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-1",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: { "content-type": "application/pdf" },
            method: "PUT",
            url: "https://uploads.example.test/draft-1",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ finalized: true }))
    vi.stubGlobal("fetch", fetcher)
    const commands = createInquiryWorkspaceApiCommands()
    const file = new File([new Uint8Array([1, 2, 3])], "scan.pdf", {
      type: "application/pdf",
    })

    const result = await commands.createAttachmentDraft({ file, inquiryId: "inquiry-1" })

    expect(result).toMatchObject({
      ok: true,
      value: { draftId: "draft-1", fileName: "scan.pdf", status: "ready" },
    })
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://uploads.example.test/draft-1")
    expect(fetcher.mock.calls[2]?.[0]).toBe("/api/dashboard/inquiries/attachments/drafts/finalize")
  })

  it("uses the exact protected same-origin upload route for controlled drafts", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-controlled-1",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: { "content-type": "application/pdf" },
            method: "PUT",
            url: "/api/dashboard/inquiries/attachments/drafts/upload?draftId=draft-controlled-1",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ uploaded: true }))
      .mockResolvedValueOnce(jsonResponse({ finalized: true }))
    vi.stubGlobal("fetch", fetcher)

    const result = await createInquiryWorkspaceApiCommands().createAttachmentDraft({
      file: new File(["safe"], "scan.pdf", { type: "application/pdf" }),
      inquiryId: "inquiry-1",
    })

    expect(result).toMatchObject({ ok: true, value: { draftId: "draft-controlled-1" } })
    expect(String(fetcher.mock.calls[1]?.[0])).toContain(
      "/api/dashboard/inquiries/attachments/drafts/upload?draftId=draft-controlled-1",
    )
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      credentials: "same-origin",
      headers: {
        "content-type": "application/pdf",
        "x-csrf-token": "test-csrf-token",
      },
      method: "PUT",
    })
  })

  it("rejects hostile signed-upload headers before direct fetch", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-1",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: {
              authorization: "Bearer hostile",
              "content-type": "application/pdf",
            },
            method: "PUT",
            url: "https://uploads.example.test/draft-1",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ discarded: true }))
    vi.stubGlobal("fetch", fetcher)
    const file = new File(["safe"], "scan.pdf", { type: "application/pdf" })

    await expect(
      createInquiryWorkspaceApiCommands().createAttachmentDraft({
        file,
        inquiryId: "inquiry-1",
      }),
    ).resolves.toEqual({ error: { code: "service-unavailable" }, ok: false })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[1]?.[0]).toBe("/api/dashboard/inquiries/attachments/drafts/discard")
    expect(fetcher.mock.calls.some(([target]) => String(target).startsWith("https://"))).toBe(false)
  })

  it("best-effort discards the created draft when direct upload fails", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-put-failure",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: { "content-type": "application/pdf" },
            method: "PUT",
            url: "https://uploads.example.test/draft-put-failure",
          },
        }),
      )
      .mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }))
      .mockResolvedValueOnce(jsonResponse({ discarded: true }))
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createInquiryWorkspaceApiCommands().createAttachmentDraft({
        file: new File(["safe"], "scan.pdf", { type: "application/pdf" }),
        inquiryId: "inquiry-1",
      }),
    ).resolves.toEqual({ error: { code: "service-timeout" }, ok: false })
    expect(fetcher.mock.calls[2]?.[0]).toBe("/api/dashboard/inquiries/attachments/drafts/discard")
    expect(JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body))).toEqual({
      draftId: "draft-put-failure",
      inquiryId: "inquiry-1",
    })
  })

  it("best-effort discards the verified draft when finalize is uncertain", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-finalize-timeout",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: { "content-type": "application/pdf" },
            method: "PUT",
            url: "https://uploads.example.test/draft-finalize-timeout",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockRejectedValueOnce(Object.assign(new Error("aborted"), { name: "AbortError" }))
      .mockResolvedValueOnce(jsonResponse({ discarded: true }))
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createInquiryWorkspaceApiCommands().createAttachmentDraft({
        file: new File(["safe"], "scan.pdf", { type: "application/pdf" }),
        inquiryId: "inquiry-1",
      }),
    ).resolves.toEqual({ error: { code: "service-timeout" }, ok: false })
    expect(fetcher.mock.calls[3]?.[0]).toBe("/api/dashboard/inquiries/attachments/drafts/discard")
  })

  it("surfaces definitive access loss returned while cleaning up a failed upload", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-access-loss",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: { "content-type": "application/pdf" },
            method: "PUT",
            url: "https://uploads.example.test/draft-access-loss",
          },
        }),
      )
      .mockRejectedValueOnce(new Error("ambiguous upload failure"))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "access-denied" } }, 403))
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createInquiryWorkspaceApiCommands().createAttachmentDraft({
        file: new File(["safe"], "scan.pdf", { type: "application/pdf" }),
        inquiryId: "inquiry-1",
      }),
    ).resolves.toEqual({ error: { code: "access-denied" }, ok: false })
  })

  it("surfaces definitive access loss from attachment finalization", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft-finalize-access-loss",
          expiresAt: "2026-08-25T00:00:00.000Z",
          upload: {
            headers: { "content-type": "application/pdf" },
            method: "PUT",
            url: "https://uploads.example.test/draft-finalize-access-loss",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ error: { code: "access-denied" } }, 403))
      .mockResolvedValueOnce(jsonResponse({ discarded: true }))
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createInquiryWorkspaceApiCommands().createAttachmentDraft({
        file: new File(["safe"], "scan.pdf", { type: "application/pdf" }),
        inquiryId: "inquiry-1",
      }),
    ).resolves.toEqual({ error: { code: "access-denied" }, ok: false })
  })

  it("sends the known detail change cursor without clinic or actor input", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ error: { code: "service-unavailable" } }, 503),
    )
    vi.stubGlobal("fetch", fetcher)

    await createInquiryWorkspaceApiCommands().loadDetail({
      inquiryId: "inquiry-1",
      knownChangeCursor: "detail.change~7",
    })

    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "/api/dashboard/inquiries/detail?inquiryId=inquiry-1&knownChangeCursor=detail.change%7E7",
    )
  })

  it("maps AbortError to service-timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(Object.assign(new Error("aborted"), { name: "AbortError" }))),
    )
    await expect(
      createInquiryWorkspaceApiCommands().loadQueue({ lifecycle: "open", unreadOnly: false }),
    ).resolves.toEqual({ error: { code: "service-timeout" }, ok: false })
  })
})
