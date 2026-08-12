import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createControlledReviewProvider,
  resetControlledReviewProvider,
} from "@/features/clinic-dashboard/reviews/server/controlled-reviews"
import { createPayloadReviewProvider } from "@/features/clinic-dashboard/reviews/server/payload-reviews"
import { defaultReviewListFilters } from "@/features/clinic-dashboard/reviews/model/review-source"

const rawReview = {
  comment: "Original review text.",
  id: "review-1",
  publicAuthorName: "Maya K.",
  publicComment: null,
  publicMeasure: "none",
  publicNotice: null,
  reviewDate: "2026-01-05T10:00:00.000Z",
  starRating: 5,
  status: "approved",
  treatment: { id: "treatment-1", name: "Dentistry" },
  withdrawalState: "active",
  withdrawnAt: null,
}

const pendingResponse = {
  id: "response-1",
  moderatedAt: null,
  moderationReason: "Internal platform reason that must not leave the BFF.",
  moderationStatus: "pending",
  pendingResponse: {
    body: "Thank you for the detailed feedback. We are reviewing it with our team.",
    submittedAt: "2026-01-06T11:00:00.000Z",
  },
  publishedResponse: null,
  review: "review-1",
}

const emptyPublishedResponse = { approvedAt: null, body: null, isBlocked: false }

const submittedAppeal = {
  createdAt: "2026-01-06T12:00:00.000Z",
  decidedAt: null,
  decisionReason: null,
  details: "The review appears to refer to a different clinic with a similar name.",
  id: "appeal-1",
  reason: "incorrect_clinic",
  review: "review-1",
  status: "submitted",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status })
}

describe("review provider contract", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "controlled-review-provider-test-secret")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    resetControlledReviewProvider()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("keeps response, appeal, publication measure, and withdrawal as independent controlled states", async () => {
    const provider = createControlledReviewProvider()
    const result = await provider.loadReviews(defaultReviewListFilters, 1)
    if (!result.ok) throw new Error(result.error)
    expect(result.value.page.items[0]).toMatchObject({
      publicMeasure: "none",
      response: { status: "approved" },
      withdrawalState: "active",
    })
    const secondPage = await provider.loadReviews(defaultReviewListFilters, 2)
    if (!secondPage.ok) throw new Error(secondPage.error)
    expect(secondPage.value.page.items.some(({ appeal }) => appeal?.status === "submitted")).toBe(true)
  })

  it("loads and minimizes Payload reviews through no-store requests", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviewResponses") return json({ docs: [pendingResponse] })
      if (endpoint.pathname === "/api/reviewAppeals") return json({ docs: [] })
      return json({
        docs: [rawReview],
        limit: Number(endpoint.searchParams.get("limit")),
        page: 1,
        totalDocs: 1,
        totalPages: 1,
      })
    })
    const result = await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReviews(
      defaultReviewListFilters,
      1,
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.value.page.items).toEqual([
      expect.objectContaining({
        author: "Maya K.",
        publicText: "Original review text.",
        response: expect.not.objectContaining({ moderationReason: expect.anything() }),
        treatment: { id: "treatment-1", label: "Dentistry" },
      }),
    ])
    expect(fetcher).toHaveBeenCalledTimes(4)
    for (const call of fetcher.mock.calls) {
      expect(call[1]).toMatchObject({ cache: "no-store", redirect: "error" })
      expect(call[1]?.headers).toMatchObject({ Authorization: "Bearer access-token" })
    }
  })

  it("fails closed on malformed upstream review data", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      json({ docs: [{ id: "review-1" }], limit: 10, page: 1, totalDocs: 1, totalPages: 1 }),
    )
    await expect(
      createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReviews(
        defaultReviewListFilters,
        1,
      ),
    ).resolves.toEqual({ error: "invalid-data", ok: false })
  })

  it("removes every historical original text when the current review is removed", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/review-1") {
        return json({ ...rawReview, publicMeasure: "removed" })
      }
      if (endpoint.pathname.endsWith("/publication-history")) {
        return json({
          data: {
            pagination: { hasNextPage: false, limit: 25, nextCursor: null },
            reviewId: "review-1",
            versions: [
              {
                actorType: "system",
                id: "publication-old",
                publicAuthorName: "Maya K.",
                publicMeasure: "none",
                publicNotice: null,
                publicText: "Original review text.",
                recordedAt: "2026-01-05T10:00:00.000Z",
                reviewDate: "2026-01-05T10:00:00.000Z",
                starRating: 5,
                status: "approved",
                withdrawalSource: null,
                withdrawalState: "active",
                withdrawnAt: null,
              },
            ],
          },
        })
      }
      if (endpoint.pathname === "/api/reviewResponses/versions") {
        return json({
          docs: [
            {
              createdAt: "2026-01-06T11:00:00.000Z",
              id: "response-version-1",
              version: {
                ...pendingResponse,
                lastAction: "submitted",
                lastActorType: "clinic_staff",
                publishedResponse: emptyPublishedResponse,
              },
            },
          ],
        })
      }
      return json({ docs: [] })
    })

    const result = await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadHistory(
      "review-1",
      "opaque cursor/value",
    )

    expect(result).toMatchObject({
      ok: true,
      value: {
        publication: { entries: [expect.not.objectContaining({ publicText: expect.anything() })] },
        response: [
          expect.objectContaining({
            pendingBody: pendingResponse.pendingResponse.body,
          }),
        ],
      },
    })
    const publicationCall = fetcher.mock.calls.find(([input]) =>
      String(input).includes("/publication-history"),
    )
    expect(new URL(String(publicationCall?.[0])).searchParams.get("cursor")).toBe("opaque cursor/value")
    expect(fetcher.mock.calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      "/api/reviews/review-1",
      "/api/reviews/review-1/publication-history",
      "/api/reviewResponses/versions",
      "/api/reviewAppeals/versions",
    ])
  })

  it("returns the accepted appeal without a fallible post-write reload", async () => {
    const numericReview = { ...rawReview, id: 20 }
    const numericAppeal = { ...submittedAppeal, id: 41, review: 20 }
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/20") return json(numericReview)
      if (endpoint.pathname === "/api/reviewResponses") return json({ docs: [] })
      if (endpoint.pathname === "/api/reviewAppeals" && init?.method === "POST") {
        return json({ doc: numericAppeal })
      }
      return json({ docs: [] })
    })

    const result = await createPayloadReviewProvider("access-token", "clinic-1", fetcher).submitAppeal("20", {
      details: submittedAppeal.details,
      reason: "incorrect_clinic",
    })

    expect(result).toMatchObject({ ok: true, value: { appeal: { id: "41", status: "submitted" } } })
    expect(fetcher).toHaveBeenCalledTimes(4)
    const write = fetcher.mock.calls.at(-1)
    const writeEndpoint = new URL(String(write?.[0]))
    expect(writeEndpoint.pathname).toBe("/api/reviewAppeals")
    expect(writeEndpoint.searchParams.get("depth")).toBe("0")
    expect(write?.[1]).toMatchObject({ method: "POST" })
    expect(write?.[1]?.headers).toMatchObject({ Authorization: "Bearer access-token" })
    expect(JSON.parse(String(write?.[1]?.body))).toEqual({
      details: submittedAppeal.details,
      reason: "incorrect_clinic",
      review: 20,
    })
  })

  it("preserves nonnumeric review relationship IDs on appeal creation", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/review-1") return json(rawReview)
      if (endpoint.pathname === "/api/reviewResponses") return json({ docs: [] })
      if (endpoint.pathname === "/api/reviewAppeals" && init?.method === "POST") {
        return json({ doc: submittedAppeal })
      }
      return json({ docs: [] })
    })

    const result = await createPayloadReviewProvider("access-token", "clinic-1", fetcher).submitAppeal(
      "review-1",
      {
        details: submittedAppeal.details,
        reason: "incorrect_clinic",
      },
    )

    expect(result).toMatchObject({ ok: true })
    expect(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1]?.body))).toMatchObject({
      review: "review-1",
    })
  })

  it("posts a first response and patches only an existing pending response", async () => {
    const numericReview = { ...rawReview, id: 19 }
    const numericResponse = {
      ...pendingResponse,
      id: 31,
      publishedResponse: emptyPublishedResponse,
      review: 19,
    }
    const firstFetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/19") return json(numericReview)
      if (endpoint.pathname === "/api/reviewResponses" && init?.method === "POST") {
        return json({ doc: numericResponse })
      }
      return json({ docs: [] })
    })
    const first = await createPayloadReviewProvider("access-token", "clinic-1", firstFetcher).submitResponse(
      "19",
      pendingResponse.pendingResponse.body,
    )
    expect(first).toMatchObject({ ok: true, value: { response: { id: "31", status: "pending" } } })
    const firstWriteEndpoint = new URL(String(firstFetcher.mock.calls.at(-1)?.[0]))
    expect(firstWriteEndpoint.pathname).toBe("/api/reviewResponses")
    expect(firstWriteEndpoint.searchParams.get("depth")).toBe("0")
    expect(firstFetcher.mock.calls.at(-1)?.[1]).toMatchObject({ method: "POST" })
    expect(JSON.parse(String(firstFetcher.mock.calls.at(-1)?.[1]?.body))).toEqual({
      pendingResponse: { body: pendingResponse.pendingResponse.body },
      review: 19,
    })

    const pendingFetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/review-1") return json(rawReview)
      if (endpoint.pathname === "/api/reviewResponses" && !init?.method) {
        return json({ docs: [pendingResponse] })
      }
      if (endpoint.pathname === "/api/reviewResponses/response-1" && init?.method === "PATCH") {
        return json(pendingResponse)
      }
      return json({ docs: [] })
    })
    const revised = await createPayloadReviewProvider(
      "access-token",
      "clinic-1",
      pendingFetcher,
    ).submitResponse("review-1", pendingResponse.pendingResponse.body)
    expect(revised).toMatchObject({ ok: true, value: { response: { status: "pending" } } })
    const pendingWriteEndpoint = new URL(String(pendingFetcher.mock.calls.at(-1)?.[0]))
    expect(pendingWriteEndpoint.pathname).toBe("/api/reviewResponses/response-1")
    expect(pendingWriteEndpoint.searchParams.get("depth")).toBe("0")
    expect(pendingFetcher.mock.calls.at(-1)?.[1]).toMatchObject({ method: "PATCH" })
    expect(JSON.parse(String(pendingFetcher.mock.calls.at(-1)?.[1]?.body))).toEqual({
      pendingResponse: { body: pendingResponse.pendingResponse.body },
    })
  })

  it("maps an upstream response conflict without a post-write reload", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/review-1") return json(rawReview)
      if (endpoint.pathname === "/api/reviewResponses" && !init?.method) {
        return json({ docs: [pendingResponse] })
      }
      if (endpoint.pathname === "/api/reviewResponses/response-1") return json({}, 409)
      return json({ docs: [] })
    })

    await expect(
      createPayloadReviewProvider("access-token", "clinic-1", fetcher).submitResponse(
        "review-1",
        pendingResponse.pendingResponse.body,
      ),
    ).resolves.toEqual({ error: "conflict", ok: false })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })

  it("rejects a response revision after moderation without issuing a write", async () => {
    const approvedResponse = {
      ...pendingResponse,
      moderatedAt: "2026-01-07T10:00:00.000Z",
      moderationStatus: "approved",
      pendingResponse: null,
      publishedResponse: {
        approvedAt: "2026-01-07T10:00:00.000Z",
        body: pendingResponse.pendingResponse.body,
        isBlocked: false,
      },
    }
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/reviews/review-1") return json(rawReview)
      if (endpoint.pathname === "/api/reviewResponses") return json({ docs: [approvedResponse] })
      return json({ docs: [] })
    })

    await expect(
      createPayloadReviewProvider("access-token", "clinic-1", fetcher).submitResponse(
        "review-1",
        pendingResponse.pendingResponse.body,
      ),
    ).resolves.toEqual({ error: "conflict", ok: false })
    expect(fetcher.mock.calls.every(([, init]) => !init?.method)).toBe(true)
  })

  it("fails closed when summary metadata exceeds the bounded page budget", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      return json({
        docs: [rawReview],
        limit: Number(endpoint.searchParams.get("limit")),
        page: 1,
        totalDocs: 1_100,
        totalPages: endpoint.searchParams.get("limit") === "100" ? 11 : 110,
      })
    })

    await expect(
      createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReviews(
        defaultReviewListFilters,
        1,
      ),
    ).resolves.toEqual({ error: "invalid-data", ok: false })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
