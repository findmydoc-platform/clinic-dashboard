import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  handleInquiryAttachmentDraftCreate,
  handleInquiryAttachmentDraftFinalize,
  handleInquiryAttachmentDraftUpload,
  handleInquiryAttachmentPreview,
  handleInquiryContactReveal,
  handleInquiryDetailLoad,
  handleInquiryMessageSend,
  handleInquiryQueueLoad,
  handleInquiryStateChange,
} from "@/features/clinic-dashboard/server"
import { handleClinicDashboardReauthenticate } from "@/features/clinic-dashboard/auth/server/public"
import { resetControlledPatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/controlled-inquiries"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const sessionCookie = "clinic_dashboard_controlled_session=controlled-clinic-staff"

function signedRequest(url: string, method: "PATCH" | "POST" | "PUT", body: unknown, cookie = sessionCookie) {
  const base = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie,
      origin: "http://localhost:3000",
    },
    method,
  })
  const token = createCsrfToken(base)
  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: `${cookie}; clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method,
  })
}

function readRequest(url: string, session = true) {
  return new NextRequest(url, {
    headers: session ? { cookie: sessionCookie } : undefined,
  })
}

function signedBinaryRequest(url: string, body: Uint8Array, mimeType: string) {
  const headers = {
    "content-length": String(body.byteLength),
    "content-type": mimeType,
    cookie: sessionCookie,
    origin: "http://localhost:3000",
  }
  const base = new NextRequest(url, { headers, method: "PUT" })
  const token = createCsrfToken(base)
  const requestBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer
  return new NextRequest(url, {
    body: requestBody,
    headers: {
      ...headers,
      cookie: `${sessionCookie}; clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
    method: "PUT",
  })
}

function requireResponse(response: Response | undefined): Response {
  expect(response).toBeDefined()
  if (!response) throw new Error("Expected a BFF response")
  return response
}

describe("patient inquiry BFF integration", () => {
  beforeEach(() => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    resetControlledPatientInquiryProvider()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    resetControlledPatientInquiryProvider()
  })

  it("persists an idempotent reply across request-scoped provider composition", async () => {
    const detailResponse = requireResponse(
      await handleInquiryDetailLoad(
        readRequest("http://localhost:3000/api/dashboard/inquiries/detail?inquiryId=inquiry-lukas-weber"),
      ),
    )
    const detailBody = (await detailResponse.json()) as { inquiry: { revision: number } }
    const message = {
      expectedRevision: detailBody.inquiry.revision,
      idempotencyKey: "integration-message-0001",
      inquiryId: "inquiry-lukas-weber",
      text: "This persists across requests.",
    }
    const first = requireResponse(
      await handleInquiryMessageSend(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/messages", "POST", message),
      ),
    )
    expect(first.status).toBe(200)

    const replay = requireResponse(
      await handleInquiryMessageSend(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/messages", "POST", message),
      ),
    )
    await expect(replay.json()).resolves.toMatchObject({ replayed: true })

    const reread = requireResponse(
      await handleInquiryDetailLoad(
        readRequest("http://localhost:3000/api/dashboard/inquiries/detail?inquiryId=inquiry-lukas-weber"),
      ),
    )
    await expect(reread.json()).resolves.toMatchObject({
      inquiry: {
        lastActivityPreview: "This persists across requests.",
        revision: detailBody.inquiry.revision + 1,
      },
    })
  })

  it("persists a controlled attachment uploaded through the protected same-origin route", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4\nSynthetic attachment\n%%EOF")
    const draftResponse = requireResponse(
      await handleInquiryAttachmentDraftCreate(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/attachments/drafts", "POST", {
          fileName: "synthetic-treatment-plan.pdf",
          inquiryId: "inquiry-lukas-weber",
          mimeType: "application/pdf",
          sizeBytes: bytes.byteLength,
        }),
      ),
    )
    expect(draftResponse.status).toBe(200)
    const draft = (await draftResponse.json()) as {
      draftId: string
      upload: { url: string }
    }
    expect(draft.upload.url).toBe(
      `/api/dashboard/inquiries/attachments/drafts/upload?draftId=${draft.draftId}`,
    )

    const uploadResponse = requireResponse(
      await handleInquiryAttachmentDraftUpload(
        signedBinaryRequest(
          new URL(draft.upload.url, "http://localhost:3000").toString(),
          bytes,
          "application/pdf",
        ),
      ),
    )
    expect(uploadResponse.status).toBe(200)
    await expect(uploadResponse.json()).resolves.toEqual({ uploaded: true })

    const finalizeResponse = requireResponse(
      await handleInquiryAttachmentDraftFinalize(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/attachments/drafts/finalize", "POST", {
          draftId: draft.draftId,
          inquiryId: "inquiry-lukas-weber",
        }),
      ),
    )
    expect(finalizeResponse.status).toBe(200)

    const messageResponse = requireResponse(
      await handleInquiryMessageSend(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/messages", "POST", {
          attachmentDraftId: draft.draftId,
          expectedRevision: 4,
          idempotencyKey: "integration-attachment-message-0001",
          inquiryId: "inquiry-lukas-weber",
          text: "Synthetic attachment persisted.",
        }),
      ),
    )
    expect(messageResponse.status).toBe(200)
    const messageBody = (await messageResponse.json()) as {
      inquiry: { timeline: { attachment?: { id: string; name: string } }[] }
    }
    const attachment = messageBody.inquiry.timeline.at(-1)?.attachment
    expect(attachment).toMatchObject({ name: "synthetic-treatment-plan.pdf" })

    const previewResponse = requireResponse(
      await handleInquiryAttachmentPreview(
        readRequest(
          `http://localhost:3000/api/dashboard/inquiries/attachments/preview?attachmentId=${attachment?.id}`,
        ),
      ),
    )
    expect(previewResponse.status).toBe(200)
    await expect(previewResponse.arrayBuffer()).resolves.toEqual(bytes.buffer)
  })

  it("rejects controlled attachment bytes without same-origin CSRF verification", async () => {
    const response = requireResponse(
      await handleInquiryAttachmentDraftUpload(
        new NextRequest(
          "http://localhost:3000/api/dashboard/inquiries/attachments/drafts/upload?draftId=draft-1",
          {
            body: "safe",
            headers: {
              "content-length": "4",
              "content-type": "application/pdf",
              cookie: sessionCookie,
              origin: "http://localhost:3000",
            },
            method: "PUT",
          },
        ),
      ),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: { code: "access-denied" } })
  })

  it("paginates the authoritative queue without duplicates", async () => {
    const first = requireResponse(
      await handleInquiryQueueLoad(
        readRequest("http://localhost:3000/api/dashboard/inquiries?lifecycle=all&unreadOnly=false"),
      ),
    )
    const firstBody = (await first.json()) as { inquiries: { id: string }[]; nextCursor?: string }
    const second = requireResponse(
      await handleInquiryQueueLoad(
        readRequest(
          `http://localhost:3000/api/dashboard/inquiries?lifecycle=all&unreadOnly=false&cursor=${firstBody.nextCursor}`,
        ),
      ),
    )
    const secondBody = (await second.json()) as { inquiries: { id: string }[] }
    const ids = [...firstBody.inquiries, ...secondBody.inquiries].map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(4)
  })

  it("keeps the actor-personal unread count on an unchanged first-page poll", async () => {
    const first = requireResponse(
      await handleInquiryQueueLoad(
        readRequest("http://localhost:3000/api/dashboard/inquiries?lifecycle=open&unreadOnly=false"),
      ),
    )
    const firstBody = (await first.json()) as {
      changeCursor: string
      unreadCount: number
    }
    const unchanged = requireResponse(
      await handleInquiryQueueLoad(
        readRequest(
          `http://localhost:3000/api/dashboard/inquiries?lifecycle=open&unreadOnly=false&knownChangeCursor=${firstBody.changeCursor}`,
        ),
      ),
    )

    await expect(unchanged.json()).resolves.toEqual({
      changeCursor: firstBody.changeCursor,
      inquiries: [],
      status: "ready",
      unchanged: true,
      unreadCount: firstBody.unreadCount,
    })
  })

  it("removes spam while keeping the conversation closed", async () => {
    const response = requireResponse(
      await handleInquiryStateChange(
        signedRequest("http://localhost:3000/api/dashboard/inquiries/state", "PATCH", {
          action: "remove-spam",
          expectedRevision: 3,
          inquiryId: "inquiry-spam-sender",
        }),
      ),
    )
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      inquiry: { handlingStatus: "submitted", lifecycle: "closed" },
    })
  })

  it("serves attachment preview bytes privately without redirecting", async () => {
    const response = requireResponse(
      await handleInquiryAttachmentPreview(
        readRequest(
          "http://localhost:3000/api/dashboard/inquiries/attachments/preview?attachmentId=attachment-lukas-1",
        ),
      ),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("content-disposition")).toContain("inline")
  })

  it("requires an explicit fresh password step-up before revealing masked contact data", async () => {
    const revealUrl = "http://localhost:3000/api/dashboard/inquiries/contact/reveal"
    const revealBody = { inquiryId: "inquiry-spam-sender" }
    const initial = requireResponse(
      await handleInquiryContactReveal(signedRequest(revealUrl, "POST", revealBody)),
    )
    expect(initial.status).toBe(401)
    await expect(initial.json()).resolves.toEqual({
      error: { code: "reauthentication-required" },
    })

    const reauthenticated = await handleClinicDashboardReauthenticate(
      signedRequest("http://localhost:3000/api/auth/reauthenticate", "POST", { password: "test-password" }),
    )
    expect(reauthenticated.status).toBe(200)
    const reauthCookie = reauthenticated.headers.get("set-cookie")?.split(";", 1)[0]
    expect(reauthCookie).toBeTruthy()

    const revealed = requireResponse(
      await handleInquiryContactReveal(
        signedRequest(revealUrl, "POST", revealBody, `${sessionCookie}; ${reauthCookie}`),
      ),
    )
    expect(revealed.status).toBe(200)
    await expect(revealed.json()).resolves.toMatchObject({
      inquiry: { contact: { state: "full" } },
    })
  })

  it("returns an unauthorized safe union without a verified session", async () => {
    const response = requireResponse(
      await handleInquiryQueueLoad(
        readRequest("http://localhost:3000/api/dashboard/inquiries?lifecycle=open&unreadOnly=false", false),
      ),
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: { code: "unauthorized" } })
  })
})
