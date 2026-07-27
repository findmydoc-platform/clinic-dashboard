import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createControlledPatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/controlled-inquiries"
import type { PatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/patient-inquiry-provider"
import { createPayloadPatientInquiryProvider } from "@/features/clinic-dashboard/messages/server/payload-inquiries"

const upstreamInquiry = {
  createdAt: "2026-07-26T08:54:00.000Z",
  email: "l.weber@example.com",
  fullName: "Lukas Weber",
  id: "inquiry-lukas-weber",
  message: "I am interested in a hair transplant and would like to know which documents to prepare.",
  phoneNumber: "+49 000 0000001",
  preferredContactWindow: "afternoon",
  status: "submitted",
  treatment: { id: "treatment-1", name: "Hair transplant" },
  treatmentTimeline: "within_one_month",
  updatedAt: "2026-07-26T08:54:00.000Z",
} as const

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

function createPayloadContractProvider(): PatientInquiryProvider {
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const endpoint = new URL(String(input))
    if (endpoint.pathname.endsWith("/unknown-inquiry")) {
      return jsonResponse({ error: "not found" }, 404)
    }
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body)) as { status: string }
      return jsonResponse({
        doc: {
          ...upstreamInquiry,
          status: body.status,
          updatedAt: "2026-07-26T09:08:00.000Z",
        },
      })
    }
    if (endpoint.pathname.endsWith(`/${upstreamInquiry.id}`)) {
      return jsonResponse(upstreamInquiry)
    }
    return jsonResponse({ docs: [upstreamInquiry] })
  })

  return createPayloadPatientInquiryProvider("access-token", fetcher)
}

const providerCases = [
  {
    create: createControlledPatientInquiryProvider,
    name: "controlled",
  },
  {
    create: createPayloadContractProvider,
    name: "payload",
  },
] as const

describe.each(providerCases)("Patient inquiry provider contract: $name", ({ create }) => {
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

  it("loads the stable ready queue shape", async () => {
    const result = await create().loadQueue()

    if (!result.ok) throw new Error(`Expected a ready queue, received ${result.error}`)
    expect(result.value).toEqual({
      inquiries: [
        expect.objectContaining({
          availableTransitions: ["in_review", "contacted", "closed", "spam"],
          id: "inquiry-lukas-weber",
          name: "Lukas Weber",
          status: "submitted",
        }),
      ],
      status: "ready",
    })
  })

  it("changes an allowed status through the deep provider interface", async () => {
    const result = await create().changeStatus({
      inquiryId: "inquiry-lukas-weber",
      status: "in_review",
    })

    if (!result.ok) throw new Error(`Expected a successful change, received ${result.error}`)
    expect(result.value).toMatchObject({
      inquiry: {
        availableTransitions: ["contacted", "closed", "spam"],
        id: "inquiry-lukas-weber",
        status: "in_review",
      },
    })
  })

  it("returns not-found for an unknown inquiry", async () => {
    await expect(
      create().changeStatus({
        inquiryId: "unknown-inquiry",
        status: "in_review",
      }),
    ).resolves.toEqual({ error: "not-found", ok: false })
  })

  it("returns conflict for a no-op or disallowed transition", async () => {
    await expect(
      create().changeStatus({
        inquiryId: "inquiry-lukas-weber",
        status: "submitted",
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })
  })
})

describe("Controlled patient inquiry provider", () => {
  it("resets to its deterministic source after a successful change", async () => {
    const provider = createControlledPatientInquiryProvider()

    await expect(
      provider.changeStatus({
        inquiryId: "inquiry-lukas-weber",
        status: "in_review",
      }),
    ).resolves.toMatchObject({ ok: true })

    await expect(provider.loadQueue()).resolves.toMatchObject({
      ok: true,
      value: {
        inquiries: [{ status: "submitted" }],
      },
    })
  })
})
