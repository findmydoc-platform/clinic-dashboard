import reviewDetailCases from "../fixtures/clinic-review-detail-v1.json"
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

  it("isolates controlled review content, exact IDs, and accepted writes by clinic", async () => {
    const first = createControlledReviewProvider("clinic-1")
    const second = createControlledReviewProvider("second-clinic")
    const result = await second.loadReviews(defaultReviewListFilters, 1)
    expect(result).toMatchObject({
      ok: true,
      value: {
        page: {
          items: expect.arrayContaining([
            expect.objectContaining({
              id: "second-clinic-seed-review-01",
              author: "Synthetic second-clinic",
            }),
          ]),
        },
      },
    })
    expect(await second.loadReview("seed-review-01")).toEqual({ ok: false, error: "not-found" })
    expect(await first.loadReview("second-clinic-seed-review-01")).toEqual({ ok: false, error: "not-found" })
    await first.submitResponse("seed-review-02", "A separate current clinic reply.")
    expect(await second.loadReview("second-clinic-seed-review-02")).not.toMatchObject({
      value: { response: { pending: { body: "A separate current clinic reply." } } },
    })
  })

  it("loads and minimizes Payload reviews through no-store requests", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses")
        return json({ docs: [pendingResponse] })
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-appeals")
        return json({ docs: [] })
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

  it.each([
    { relation: 44, detail: reviewDetailCases.accepted[0] },
    { relation: "44", detail: reviewDetailCases.accepted[3] },
  ])(
    "resolves scalar treatment $relation through the authorized current review",
    async ({ relation, detail }) => {
      const fetcher = vi.fn<typeof fetch>(async (input) => {
        const endpoint = new URL(String(input))
        if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1")
          return json({
            data: { ...detail.data, id: "review-1", treatment: { id: "44", name: "Dentistry" } },
          })
        if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses")
          return json({ docs: [pendingResponse] })
        if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-appeals")
          return json({ docs: [] })
        return json({
          docs: [{ ...rawReview, treatment: relation }],
          limit: Number(endpoint.searchParams.get("limit")),
          page: 2,
          totalDocs: 11,
          totalPages: 2,
        })
      })
      const filters = { ...defaultReviewListFilters, rating: "5" as const, treatment: "44" }
      const result = await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReviews(
        filters,
        2,
      )
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.error)
      expect(result.value.page).toMatchObject({ page: 2, total: 11, pageCount: 2 })
      expect(result.value.page.items[0]).toMatchObject({
        id: "review-1",
        treatment: { id: "44", label: "Dentistry" },
        withdrawalState: detail.data.withdrawalState,
        response: { id: "response-1", status: "pending" },
      })
      expect(result.value.page.items[0].publicText).not.toBe(rawReview.comment)
      if (detail.data.withdrawalState === "withdrawn") {
        expect(result.value.page.items[0].author).toBe("Anonymous patient")
        expect(result.value.page.items[0].publicText).toBeUndefined()
      }
      expect(result.value.treatments).toEqual([{ id: "44", label: "Dentistry" }])
      expect(result.value.summary).toMatchObject({ rating: 5, total: 2 })
      const paths = fetcher.mock.calls.map(([input]) => new URL(String(input)).pathname)
      expect(
        paths.filter((path) => path === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1"),
      ).toHaveLength(1)
      expect(paths.some((path) => path.startsWith("/api/treatments"))).toBe(false)
      const pageRead = fetcher.mock.calls.find(
        ([input]) => new URL(String(input)).searchParams.get("limit") === "10",
      )
      expect(new URL(String(pageRead?.[0])).searchParams.get("where[starRating][equals]")).toBe("5")
      expect(new URL(String(pageRead?.[0])).searchParams.get("where[treatment][equals]")).toBe("44")
      const detailRead = fetcher.mock.calls.find(([input]) =>
        new URL(String(input)).pathname.startsWith("/api/clinic-dashboard/"),
      )
      expect(detailRead?.[1]).toMatchObject({
        cache: "no-store",
        redirect: "error",
        headers: {
          Authorization: "Bearer access-token",
          "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
        },
      })
    },
  )

  it.each([
    { body: { error: { code: "CONTENT_ACCESS_DENIED" } }, status: 403, error: "forbidden" },
    { body: { error: { code: "TARGET_UNAVAILABLE" } }, status: 404, error: "unavailable" },
    { body: reviewDetailCases.rejected[2], status: 200, error: "invalid-data" },
    { body: reviewDetailCases.accepted[0], status: 200, error: "invalid-data" },
  ])("fails the scalar list read closed on detail $status/$error", async ({ body, status, error }) => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname.startsWith("/api/clinic-dashboard/clinics/clinic-1/reviews/"))
        return json(body, status)
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews")
        return json({
          docs: [{ ...rawReview, treatment: 44 }],
          limit: 10,
          page: 1,
          totalDocs: 1,
          totalPages: 1,
        })
      return json({ docs: [] })
    })
    expect(
      await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReviews(
        defaultReviewListFilters,
        1,
      ),
    ).toEqual({ ok: false, error })
  })

  it("shares eight seconds across scalar list, detail and workflow reads", async () => {
    vi.useFakeTimers()
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
      const abort = new AbortController()
      setTimeout(() => abort.abort(new DOMException("Timed out", "TimeoutError")), delay)
      return abort.signal
    })
    try {
      const fetcher = vi.fn<typeof fetch>(
        (input, init) =>
          new Promise<Response>((resolve, reject) => {
            const signal = init!.signal!
            signal.addEventListener("abort", () => reject(signal.reason), { once: true })
            setTimeout(() => {
              const endpoint = new URL(String(input))
              resolve(
                endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews"
                  ? json({
                      docs: [{ ...rawReview, treatment: 44 }],
                      limit: 10,
                      page: 1,
                      totalDocs: 1,
                      totalPages: 1,
                    })
                  : endpoint.pathname.startsWith("/api/clinic-dashboard/clinics/clinic-1/reviews/")
                    ? json({ data: { ...reviewDetailCases.accepted[0].data, id: "review-1" } })
                    : json({ docs: [] }),
              )
            }, 3_000)
          }),
      )
      const read = createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReviews(
        defaultReviewListFilters,
        1,
      )
      await vi.advanceTimersByTimeAsync(8_000)
      expect(await read).toEqual({ ok: false, error: "timeout" })
    } finally {
      timeout.mockRestore()
      vi.useRealTimers()
    }
  })

  it("removes every historical original text when the current review is removed", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/record") {
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
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses/versions") {
        return json({
          docs: [
            {
              createdAt: "2026-01-06T11:00:00.000Z",
              id: "response-version-1",
              version: {
                lastAction: "submitted",
                lastActorType: "clinic_staff",
                moderationStatus: "pending",
                pendingResponse: pendingResponse.pendingResponse,
                publishedResponse: emptyPublishedResponse,
              },
            },
          ],
        })
      }
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-appeals/versions") {
        return json({
          docs: [
            {
              createdAt: "2026-01-06T12:00:00.000Z",
              id: "appeal-version-1",
              version: {
                decidedAt: null,
                decisionReason: null,
                lastAction: "submitted",
                lastActorType: "clinic_staff",
                status: "submitted",
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
        appeal: [
          expect.objectContaining({
            action: "submitted",
            id: "appeal-version-1",
            status: "submitted",
          }),
        ],
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
      "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/record",
      "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/publication-history",
      "/api/clinic-dashboard/clinics/clinic-1/review-responses/versions",
      "/api/clinic-dashboard/clinics/clinic-1/review-appeals/versions",
    ])
  })

  it("returns the accepted appeal without a fallible post-write reload", async () => {
    const numericReview = { ...rawReview, id: 20 }
    const numericAppeal = { ...submittedAppeal, id: 41, review: 20 }
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/20/record")
        return json(numericReview)
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses")
        return json({ docs: [] })
      if (
        endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-appeals" &&
        init?.method === "POST"
      ) {
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
    expect(writeEndpoint.pathname).toBe("/api/clinic-dashboard/clinics/clinic-1/review-appeals")
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
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/record")
        return json(rawReview)
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses")
        return json({ docs: [] })
      if (
        endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-appeals" &&
        init?.method === "POST"
      ) {
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
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/19/record")
        return json(numericReview)
      if (
        endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses" &&
        init?.method === "POST"
      ) {
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
    expect(firstWriteEndpoint.pathname).toBe("/api/clinic-dashboard/clinics/clinic-1/review-responses")
    expect(firstWriteEndpoint.searchParams.get("depth")).toBe("0")
    expect(firstFetcher.mock.calls.at(-1)?.[1]).toMatchObject({ method: "POST" })
    expect(JSON.parse(String(firstFetcher.mock.calls.at(-1)?.[1]?.body))).toEqual({
      pendingResponse: { body: pendingResponse.pendingResponse.body },
      review: 19,
    })

    const pendingFetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/record")
        return json(rawReview)
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses" && !init?.method) {
        return json({ docs: [pendingResponse] })
      }
      if (
        endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses/response-1" &&
        init?.method === "PATCH"
      ) {
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
    expect(pendingWriteEndpoint.pathname).toBe(
      "/api/clinic-dashboard/clinics/clinic-1/review-responses/response-1",
    )
    expect(pendingWriteEndpoint.searchParams.get("depth")).toBe("0")
    expect(pendingFetcher.mock.calls.at(-1)?.[1]).toMatchObject({ method: "PATCH" })
    expect(JSON.parse(String(pendingFetcher.mock.calls.at(-1)?.[1]?.body))).toEqual({
      pendingResponse: { body: pendingResponse.pendingResponse.body },
    })
  })

  it("maps an upstream response conflict without a post-write reload", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const endpoint = new URL(String(input))
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/record")
        return json(rawReview)
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses" && !init?.method) {
        return json({ docs: [pendingResponse] })
      }
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses/response-1")
        return json({}, 409)
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
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/reviews/review-1/record")
        return json(rawReview)
      if (endpoint.pathname === "/api/clinic-dashboard/clinics/clinic-1/review-responses")
        return json({ docs: [approvedResponse] })
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

describe("ordinary exact review detail contract", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "controlled-review-provider-test-secret")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
  })
  it.each(reviewDetailCases.accepted)(
    "accepts a Website-owned minimized current projection",
    async (body) => {
      const fetcher = vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input))
        return Response.json(
          url.pathname.startsWith("/api/clinic-dashboard/clinics/clinic-1/reviews/") ? body : { docs: [] },
        )
      })
      const result = await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReview(
        "review-204",
      )
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.id).toBe("review-204")
        expect(result.value.author).toBe(body.data.publicAuthorName ?? "Anonymous patient")
        expect(result.value.publicText).toBe(
          "comment" in body.data
            ? body.data.comment
            : "publicComment" in body.data
              ? body.data.publicComment
              : undefined,
        )
      }
      expect(fetcher.mock.calls[0][0].toString()).toBe(
        "https://preview.findmydoc.eu/api/clinic-dashboard/clinics/clinic-1/reviews/review-204",
      )
    },
  )
  it.each(reviewDetailCases.rejected)("rejects unknown and prohibited projected details", async (body) => {
    const fetcher = vi.fn(async () => Response.json(body))
    expect(
      await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReview("review-204"),
    ).toEqual({ ok: false, error: "invalid-data" })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it("rejects a detail for another selected record", async () => {
    const fetcher = vi.fn(async () => Response.json(reviewDetailCases.accepted[0]))
    expect(
      await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReview("another-review"),
    ).toEqual({ ok: false, error: "invalid-data" })
  })
})

describe("exact review read failure boundaries", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "controlled-review-provider-test-secret")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
  })
  it.each([
    { status: 400, code: "INVALID_INPUT", error: "invalid-input" },
    { status: 401, code: "UNAUTHENTICATED", error: "unauthorized" },
    { status: 403, code: "CONTENT_ACCESS_DENIED", error: "forbidden" },
    { status: 404, code: "TARGET_UNAVAILABLE", error: "not-found" },
    { status: 503, code: "SERVICE_UNAVAILABLE", error: "unavailable" },
  ])("preserves the closed $code outcome without a historical read", async ({ status, code, error }) => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ error: { code } }, { status }),
    )
    expect(
      await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReview("review-204"),
    ).toEqual({ ok: false, error })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      cache: "no-store",
      redirect: "error",
      headers: {
        Authorization: "Bearer access-token",
        "X-Findmydoc-Clinic-Dashboard-Contract": "inquiry-communication-v2",
      },
    })
  })
  it("rejects an unknown error instead of claiming the exact target is missing", async () => {
    const fetcher = vi.fn(async () => Response.json({ error: { code: "FUTURE_ERROR" } }, { status: 404 }))
    expect(
      await createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReview("review-204"),
    ).toEqual({ ok: false, error: "invalid-data" })
  })
  it("bounds the combined detail and workflow reads by eight seconds", async () => {
    vi.useFakeTimers()
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
      const abort = new AbortController()
      setTimeout(() => abort.abort(new DOMException("Timed out", "TimeoutError")), delay)
      return abort.signal
    })
    try {
      const fetcher = vi.fn(
        (input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((resolve, reject) => {
            const signal = init!.signal!
            signal.addEventListener("abort", () => reject(signal.reason), { once: true })
            setTimeout(
              () =>
                resolve(
                  Response.json(
                    new URL(String(input)).pathname.startsWith(
                      "/api/clinic-dashboard/clinics/clinic-1/reviews/",
                    )
                      ? reviewDetailCases.accepted[0]
                      : { docs: [] },
                  ),
                ),
              5_000,
            )
          }),
      )
      const read = createPayloadReviewProvider("access-token", "clinic-1", fetcher).loadReview("review-204")
      await vi.advanceTimersByTimeAsync(8_000)
      expect(await read).toEqual({ ok: false, error: "timeout" })
      expect(fetcher).toHaveBeenCalledTimes(3)
    } finally {
      timeout.mockRestore()
      vi.useRealTimers()
    }
  })
})
