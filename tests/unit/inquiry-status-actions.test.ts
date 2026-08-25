import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  handleInquiryAttachmentDownload,
  handleInquiryDetailLoad,
  handleInquiryNoteAdd,
  handleInquiryQueueLoad,
  handleInquiryStateChange,
} from "@/features/clinic-dashboard/messages/server/public"
import type {
  PatientInquiryProvider,
  PatientInquiryProviderFactory,
} from "@/features/clinic-dashboard/messages/server/patient-inquiry-provider"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"
import { createInquiryDetail, createInquirySnapshot } from "../support/inquiries"

const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  resolveClinicDashboardRouteAccess: accessMocks.resolve,
}))

function signedRequest(url: string, method: "PATCH" | "POST" | "PUT", body: unknown) {
  const base = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method,
  })
  const token = createCsrfToken(base)
  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: `clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method,
  })
}

function requireResponse(response: Response | undefined): Response {
  expect(response).toBeDefined()
  if (!response) throw new Error("Expected a BFF response")
  return response
}

function provider(overrides: Partial<PatientInquiryProvider> = {}): PatientInquiryProvider {
  const detail = createInquiryDetail()
  return {
    addInternalNote: vi.fn(async () => ({ ok: true as const, value: { inquiry: detail } })),
    changeReadPosition: vi.fn(async () => ({
      ok: true as const,
      value: { unread: { count: 0, isUnread: false } },
    })),
    changeState: vi.fn(async () => ({ ok: true as const, value: { inquiry: detail } })),
    createAttachmentDraft: vi.fn(async () => ({
      ok: true as const,
      value: {
        draftId: "draft-1",
        expiresAt: "2026-08-25T00:00:00.000Z",
        upload: {
          headers: { "content-type": "application/pdf" },
          method: "PUT" as const,
          url: "https://uploads.example.test/draft-1",
        },
      },
    })),
    discardAttachmentDraft: vi.fn(async () => ({
      ok: true as const,
      value: { discarded: true },
    })),
    downloadAttachment: vi.fn(async () => ({
      ok: true as const,
      value: {
        body: new Uint8Array([1, 2, 3]).buffer,
        contentType: "application/pdf" as const,
      },
    })),
    finalizeAttachmentDraft: vi.fn(async () => ({
      ok: true as const,
      value: { finalized: true },
    })),
    loadDetail: vi.fn(async () => ({
      ok: true as const,
      value: { changeCursor: "change-1", inquiry: detail, unchanged: false },
    })),
    loadQueue: vi.fn(async () => ({ ok: true as const, value: createInquirySnapshot() })),
    previewAttachment: vi.fn(async () => ({
      ok: true as const,
      value: {
        body: new Uint8Array([1, 2, 3]).buffer,
        contentType: "application/pdf" as const,
      },
    })),
    revealContact: vi.fn(async () => ({ ok: true as const, value: { inquiry: detail } })),
    sendExternalMessage: vi.fn(async () => ({
      ok: true as const,
      value: { inquiry: detail },
    })),
    ...overrides,
  }
}

describe("inquiry same-origin BFF", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    accessMocks.resolve.mockResolvedValue({
      accessToken: "verified-token",
      applyToResponse: (response: Response) => response,
      capabilities: ["clinic-inquiries:view", "clinic-inquiries:edit"],
      clinicId: "verified-clinic",
      status: "approved",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("keeps tenant scope and upstream contract negotiation server-owned", async () => {
    const scoped = provider()
    const factory = vi.fn(() => scoped) satisfies PatientInquiryProviderFactory
    const response = requireResponse(
      await handleInquiryQueueLoad(
        new NextRequest(
          "http://localhost:3000/api/dashboard/inquiries?lifecycle=open&unreadOnly=false&clinicId=other-clinic",
          {
            headers: {
              "x-findmydoc-clinic-dashboard-contract": "attacker-selected-contract",
            },
          },
        ),
        factory,
      ),
    )

    expect(response.status).toBe(200)
    expect(factory).toHaveBeenCalledWith("verified-token", "verified-clinic")
    expect(scoped.loadQueue).toHaveBeenCalledWith({ lifecycle: "open", unreadOnly: false })
  })

  it("passes opaque change cursors through queue and detail reads", async () => {
    const scoped = provider()
    await handleInquiryQueueLoad(
      new NextRequest(
        "http://localhost:3000/api/dashboard/inquiries?lifecycle=open&unreadOnly=false&knownChangeCursor=queue-marker-1",
      ),
      () => scoped,
    )
    await handleInquiryDetailLoad(
      new NextRequest(
        "http://localhost:3000/api/dashboard/inquiries/detail?inquiryId=inquiry-1&knownChangeCursor=detail-marker-1&knownRevision=7",
      ),
      () => scoped,
    )

    expect(scoped.loadQueue).toHaveBeenCalledWith({
      knownChangeCursor: "queue-marker-1",
      lifecycle: "open",
      unreadOnly: false,
    })
    expect(scoped.loadDetail).toHaveBeenCalledWith({
      inquiryId: "inquiry-1",
      knownChangeCursor: "detail-marker-1",
      knownRevision: 7,
    })
  })

  it("rejects tenant and actor fields in mutation bodies", async () => {
    const scoped = provider()
    const response = requireResponse(
      await handleInquiryStateChange(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/state", "PATCH", {
          action: "close",
          actorId: "other-staff",
          clinicId: "other-clinic",
          expectedRevision: 1,
          inquiryId: "inquiry-1",
        }),
        () => scoped,
      ),
    )

    expect(response.status).toBe(400)
    expect(scoped.changeState).not.toHaveBeenCalled()
  })

  it("rejects Submitted as a post-intake handling target", async () => {
    const scoped = provider()
    const response = requireResponse(
      await handleInquiryStateChange(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/state", "PATCH", {
          action: "set-handling-status",
          expectedRevision: 1,
          handlingStatus: "submitted",
          inquiryId: "inquiry-1",
        }),
        () => scoped,
      ),
    )

    expect(response.status).toBe(400)
    expect(scoped.changeState).not.toHaveBeenCalled()
  })

  it("preserves internal-note plain text exactly", async () => {
    const scoped = provider()
    const text = "  Keep intentional spacing.\nSecond line.  "
    const response = requireResponse(
      await handleInquiryNoteAdd(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/notes", "POST", {
          idempotencyKey: "note-action-0001",
          inquiryId: "inquiry-1",
          text,
        }),
        () => scoped,
      ),
    )

    expect(response.status).toBe(200)
    expect(scoped.addInternalNote).toHaveBeenCalledWith({
      idempotencyKey: "note-action-0001",
      inquiryId: "inquiry-1",
      text,
    })
  })

  it("turns provider exceptions into the private safe error union", async () => {
    const scoped = provider({
      loadQueue: vi.fn(async () => Promise.reject(new Error("sensitive provider detail"))),
    })
    const response = requireResponse(
      await handleInquiryQueueLoad(
        new NextRequest("http://localhost:3000/api/dashboard/inquiries?lifecycle=open&unreadOnly=false"),
        () => scoped,
      ),
    )
    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: { code: "service-unavailable" } })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })

  it("streams attachment bytes with its own safe headers and never redirects", async () => {
    const response = requireResponse(
      await handleInquiryAttachmentDownload(
        new NextRequest(
          "http://localhost:3000/api/dashboard/inquiries/attachments/download?attachmentId=attachment-1",
        ),
        () => provider(),
      ),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="inquiry-attachment.pdf"')
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3])
  })
})
