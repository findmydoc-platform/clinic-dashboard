import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPayloadPatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/payload-inquiries"

const upstreamInquiry = {
  assignedTo: { id: "platform-user", name: "Private assignee" },
  clinic: { id: "clinic-1", name: "Clinic One" },
  consent: {
    accepted: true,
    acceptedAt: "2026-07-26T08:50:00.000Z",
    text: "Private evidence",
  },
  createdAt: "2026-07-26T08:54:00.000Z",
  email: "l.weber@example.com",
  fullName: "Lukas Weber",
  id: "inquiry-1",
  message: "I would like to know which documents to prepare.",
  phoneNumber: "+49 000 0000001",
  preferredContactWindow: "afternoon",
  status: "submitted",
  treatment: { id: "treatment-1", name: "Hair transplant" },
  treatmentTimeline: "within_one_month",
  updatedAt: "2026-07-26T08:54:00.000Z",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("Patient inquiry Payload adapter", () => {
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

  it("projects only purpose-specific own-clinic inquiry fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ docs: [upstreamInquiry] }))
    const provider = createPayloadPatientInquiryProvider("access-token", fetcher)

    await expect(provider.loadQueue()).resolves.toEqual({
      ok: true,
      value: {
        inquiries: [
          {
            availableTransitions: ["in_review", "contacted", "closed", "spam"],
            contactWindow: "Afternoon",
            createdAt: "2026-07-26T08:54:00.000Z",
            dateLabel: "26 July 2026",
            email: "l.weber@example.com",
            id: "inquiry-1",
            interest: "Hair transplant",
            message: "I would like to know which documents to prepare.",
            name: "Lukas Weber",
            phone: "+49 000 0000001",
            status: "submitted",
            timeLabel: "10:54",
            treatmentTimeline: "Within one month",
          },
        ],
        status: "ready",
      },
    })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe(
      "https://preview.findmydoc.eu/api/patientClinicInquiries?depth=1&limit=100&sort=-createdAt",
    )
    expect(init).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
      },
      redirect: "error",
    })
  })

  it("hides the current-state read and status write behind changeStatus", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(upstreamInquiry))
      .mockResolvedValueOnce(
        jsonResponse({
          doc: {
            ...upstreamInquiry,
            status: "in_review",
            updatedAt: "2026-07-26T09:08:00.000Z",
          },
        }),
      )
    const provider = createPayloadPatientInquiryProvider("access-token", fetcher)

    const result = await provider.changeStatus({
      inquiryId: "inquiry-1",
      status: "in_review",
    })

    expect(result).toMatchObject({
      ok: true,
      value: {
        changedAt: "11:08",
        inquiry: {
          availableTransitions: ["contacted", "closed", "spam"],
          status: "in_review",
        },
      },
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
    const [currentUrl, currentInit] = fetcher.mock.calls[0] ?? []
    const [updateUrl, updateInit] = fetcher.mock.calls[1] ?? []
    const expectedUrl = "https://preview.findmydoc.eu/api/patientClinicInquiries/inquiry-1"

    expect(String(currentUrl)).toBe(expectedUrl)
    expect(currentInit).toMatchObject({
      cache: "no-store",
      redirect: "error",
    })
    expect(currentInit?.body).toBeUndefined()
    expect(currentInit?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer access-token",
    })
    expect(currentInit?.method).toBeUndefined()

    expect(String(updateUrl)).toBe(expectedUrl)
    expect(updateInit).toMatchObject({
      body: '{"status":"in_review"}',
      cache: "no-store",
      method: "PATCH",
      redirect: "error",
    })
    expect(updateInit?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer access-token",
      "Content-Type": "application/json",
    })
  })

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [500, "temporarily-unavailable"],
  ] as const)("maps a queue HTTP %i response to %s", async (status, error) => {
    const provider = createPayloadPatientInquiryProvider(
      "access-token",
      vi.fn(async () => jsonResponse({ error: "rejected" }, status)) as typeof fetch,
    )

    await expect(provider.loadQueue()).resolves.toEqual({ error, ok: false })
  })

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [500, "temporarily-unavailable"],
  ] as const)("maps a current-inquiry HTTP %i response to %s", async (status, error) => {
    const provider = createPayloadPatientInquiryProvider(
      "access-token",
      vi.fn(async () => jsonResponse({ error: "rejected" }, status)) as typeof fetch,
    )

    await expect(provider.changeStatus({ inquiryId: "inquiry-1", status: "in_review" })).resolves.toEqual({
      error,
      ok: false,
    })
  })

  it.each([
    [400, "conflict"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [422, "conflict"],
    [500, "temporarily-unavailable"],
  ] as const)("maps a status-write HTTP %i response to %s", async (status, error) => {
    const provider = createPayloadPatientInquiryProvider(
      "access-token",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(upstreamInquiry))
        .mockResolvedValueOnce(jsonResponse({ error: "rejected" }, status)),
    )

    await expect(provider.changeStatus({ inquiryId: "inquiry-1", status: "in_review" })).resolves.toEqual({
      error,
      ok: false,
    })
  })

  it("maps malformed queue data and queue network failures without throwing", async () => {
    const malformed = createPayloadPatientInquiryProvider(
      "access-token",
      vi.fn(async () => jsonResponse({ docs: [{ id: "inquiry-1" }] })) as typeof fetch,
    )
    await expect(malformed.loadQueue()).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })

    const unavailable = createPayloadPatientInquiryProvider(
      "access-token",
      vi.fn(async () => {
        throw new Error("network unavailable")
      }) as typeof fetch,
    )
    await expect(unavailable.loadQueue()).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })
  })

  it("maps malformed status-write data and status-write network failures without throwing", async () => {
    const malformed = createPayloadPatientInquiryProvider(
      "access-token",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(upstreamInquiry))
        .mockResolvedValueOnce(jsonResponse({ doc: { id: "inquiry-1" } })),
    )
    await expect(malformed.changeStatus({ inquiryId: "inquiry-1", status: "in_review" })).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })

    const unavailable = createPayloadPatientInquiryProvider(
      "access-token",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(upstreamInquiry))
        .mockRejectedValueOnce(new Error("network unavailable")),
    )
    await expect(unavailable.changeStatus({ inquiryId: "inquiry-1", status: "in_review" })).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })
  })

  it.each([
    ["current inquiry ID", { currentId: "inquiry-2", updatedId: undefined, updatedStatus: undefined }],
    ["updated inquiry ID", { currentId: undefined, updatedId: "inquiry-2", updatedStatus: undefined }],
    ["updated inquiry status", { currentId: undefined, updatedId: undefined, updatedStatus: "contacted" }],
  ] as const)("fails closed when Payload returns a mismatched %s", async (_case, mismatch) => {
    const currentInquiry = {
      ...upstreamInquiry,
      id: mismatch.currentId ?? upstreamInquiry.id,
    }
    const updatedInquiry = {
      ...upstreamInquiry,
      id: mismatch.updatedId ?? upstreamInquiry.id,
      status: mismatch.updatedStatus ?? "in_review",
      updatedAt: "2026-07-26T09:08:00.000Z",
    }
    const provider = createPayloadPatientInquiryProvider(
      "access-token",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(currentInquiry))
        .mockResolvedValueOnce(jsonResponse({ doc: updatedInquiry })),
    )

    await expect(provider.changeStatus({ inquiryId: "inquiry-1", status: "in_review" })).resolves.toEqual({
      error: "temporarily-unavailable",
      ok: false,
    })
  })
})
