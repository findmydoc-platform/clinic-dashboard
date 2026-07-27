import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchPatientInquiry,
  fetchPatientInquiryQueue,
  updatePatientInquiryStatus,
} from "@/features/clinic-dashboard/messages/server/public"

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

  afterEach(() => vi.unstubAllEnvs())

  it("projects only purpose-specific own-clinic inquiry fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ docs: [upstreamInquiry] }))

    await expect(fetchPatientInquiryQueue("access-token", fetcher)).resolves.toEqual({
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

  it("sends only the requested status and projects the updated inquiry", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.body).toBe('{"status":"in_review"}')
      return jsonResponse({
        doc: {
          ...upstreamInquiry,
          status: "in_review",
          updatedAt: "2026-07-26T09:08:00.000Z",
        },
      })
    })

    const result = await updatePatientInquiryStatus("access-token", "inquiry-1", "in_review", fetcher)

    expect(result.changedAt).toBe("11:08")
    expect(result.inquiry.status).toBe("in_review")
    expect(result.inquiry.availableTransitions).toEqual(["contacted", "closed", "spam"])
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe("https://preview.findmydoc.eu/api/patientClinicInquiries/inquiry-1")
    expect(init).toMatchObject({
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      method: "PATCH",
    })
  })

  it("loads one own-clinic inquiry before a server-side transition check", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse(upstreamInquiry))

    await expect(fetchPatientInquiry("access-token", "inquiry/1", fetcher)).resolves.toMatchObject({
      id: "inquiry-1",
      status: "submitted",
    })

    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toBe("https://preview.findmydoc.eu/api/patientClinicInquiries/inquiry%2F1")
    expect(init).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
      },
      redirect: "error",
    })
  })

  it("fails closed for malformed and rejected upstream responses", async () => {
    await expect(
      fetchPatientInquiryQueue(
        "access-token",
        vi.fn(async () => jsonResponse({ docs: [{ id: "inquiry-1" }] })) as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "temporarily-unavailable" })

    await expect(
      updatePatientInquiryStatus(
        "access-token",
        "inquiry-1",
        "closed",
        vi.fn(async () => jsonResponse({ error: "not allowed" }, 400)) as typeof fetch,
      ),
    ).rejects.toMatchObject({ kind: "conflict" })
  })
})
