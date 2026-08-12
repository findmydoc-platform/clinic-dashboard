import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import type {
  ClinicReviewRecord,
  ReviewAppealWorkflow,
  ReviewHistorySnapshot,
  ReviewListFilters,
  ReviewPublicationHistoryEntry,
  ReviewResponseWorkflow,
  ReviewTreatmentOption,
  ReviewsSourceSnapshot,
} from "../model/review-source"
import {
  canSubmitReviewResponse,
  reviewAppealReasons,
  reviewAppealStatuses,
  reviewPublicMeasures,
  reviewResponseStatuses,
  reviewWithdrawalStates,
} from "../model/review-source"
import type {
  ReviewChangeError,
  ReviewHistoryError,
  ReviewProvider,
  ReviewProviderResult,
  ReviewReadError,
} from "./review-provider"

const relationshipIdSchema = z.union([z.string().min(1), z.number()]).transform(String)
const timestampSchema = z.string().datetime({ offset: true })
const treatmentSchema = z.object({ id: relationshipIdSchema, name: z.string().trim().min(1).max(200) })
const relationSchema = z.union([relationshipIdSchema, treatmentSchema])

const rawReviewSchema = z.object({
  id: relationshipIdSchema,
  publicAuthorName: z.string().trim().min(1).max(200).nullish(),
  publicComment: z.string().trim().min(1).max(10_000).nullish(),
  publicMeasure: z.enum(reviewPublicMeasures),
  publicNotice: z.string().trim().min(1).max(10_000).nullish(),
  comment: z.string().trim().min(1).max(10_000).nullish(),
  reviewDate: timestampSchema,
  starRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  status: z.literal("approved"),
  treatment: relationSchema,
  withdrawalState: z.enum(reviewWithdrawalStates),
  withdrawnAt: timestampSchema.nullish(),
})

const pendingResponseSchema = z
  .union([
    z.object({ body: z.string().trim().min(10).max(2_000), submittedAt: timestampSchema }),
    z.object({ body: z.null().optional(), submittedAt: z.null().optional() }),
  ])
  .nullish()
const publishedResponseSchema = z
  .union([
    z.object({
      approvedAt: timestampSchema,
      body: z.string().trim().min(10).max(2_000),
      isBlocked: z.boolean().nullish(),
    }),
    z.object({
      approvedAt: z.null().optional(),
      body: z.null().optional(),
      isBlocked: z.boolean().nullish(),
    }),
  ])
  .nullish()

const rawResponseSchema = z.object({
  id: relationshipIdSchema,
  moderatedAt: timestampSchema.nullish(),
  moderationStatus: z.enum(reviewResponseStatuses),
  pendingResponse: pendingResponseSchema,
  publishedResponse: publishedResponseSchema,
  review: relationshipIdSchema,
})

const rawAppealSchema = z.object({
  createdAt: timestampSchema,
  decidedAt: timestampSchema.nullish(),
  decisionReason: z.string().trim().min(10).max(2_000).nullish(),
  details: z.string().trim().min(10).max(2_000),
  id: relationshipIdSchema,
  reason: z.enum(reviewAppealReasons),
  review: relationshipIdSchema,
  status: z.enum(reviewAppealStatuses),
})

const payloadListMetadataSchema = {
  limit: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().nullish(),
  totalDocs: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
} as const

const rawReviewListSchema = z.object({ docs: z.array(rawReviewSchema), ...payloadListMetadataSchema })
const rawResponseListSchema = z.object({ docs: z.array(rawResponseSchema) })
const rawAppealListSchema = z.object({ docs: z.array(rawAppealSchema) })

const rawPublicationHistorySchema = z.object({
  data: z.object({
    pagination: z.object({
      hasNextPage: z.boolean(),
      limit: z.number().int().min(1).max(100),
      nextCursor: z.string().min(1).max(2_048).nullable(),
    }),
    reviewId: relationshipIdSchema,
    versions: z.array(
      z.object({
        actorType: z.enum(["patient", "platform_staff", "system"]),
        id: relationshipIdSchema,
        publicAuthorName: z.string().trim().min(1).max(200).nullable(),
        publicMeasure: z.enum(reviewPublicMeasures),
        publicNotice: z.string().trim().min(1).max(10_000).nullable(),
        publicText: z.string().trim().min(1).max(10_000).nullable(),
        recordedAt: timestampSchema,
        reviewDate: timestampSchema,
        starRating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
        status: z.enum(["approved", "pending", "rejected"]),
        withdrawalSource: z.enum(["patient", "platform"]).nullable(),
        withdrawalState: z.enum(reviewWithdrawalStates),
        withdrawnAt: timestampSchema.nullable(),
      }),
    ),
  }),
})

const rawResponseVersionSchema = z.object({
  createdAt: timestampSchema,
  id: relationshipIdSchema,
  version: rawResponseSchema.extend({
    lastAction: z.enum([
      "approved",
      "blocked",
      "pending_edited",
      "rejected",
      "revision_submitted",
      "seeded",
      "submitted",
    ]),
    lastActorType: z.enum(["clinic_staff", "platform_staff", "system"]),
  }),
})
const rawAppealVersionSchema = z.object({
  createdAt: timestampSchema,
  id: relationshipIdSchema,
  version: rawAppealSchema.extend({
    lastAction: z.enum(["dismissed", "reviewed", "seeded", "submitted", "under_review", "upheld"]),
    lastActorType: z.enum(["clinic_staff", "platform_staff", "system"]),
  }),
})
const rawResponseVersionListSchema = z.object({ docs: z.array(rawResponseVersionSchema).max(1_000) })
const rawAppealVersionListSchema = z.object({ docs: z.array(rawAppealVersionSchema).max(1_000) })

type PayloadJsonResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ kind: "network" | "timeout"; ok: false }>
  | Readonly<{ ok: false; status: number }>

const PAGE_LIMIT = 10
const SUMMARY_PAGE_LIMIT = 100
const SUMMARY_MAX_PAGES = 10
const SUMMARY_TOTAL_TIMEOUT_MS = 12_000
const REQUEST_TIMEOUT_MS = 8_000

function endpointFor(pathname: string) {
  return new URL(pathname, validateEnvironment().PAYLOAD_API_URL)
}

function mutationEndpoint(pathname: string) {
  const endpoint = endpointFor(pathname)
  endpoint.searchParams.set("depth", "0")
  return endpoint
}

function requestHeaders(accessToken: string) {
  return { Accept: "application/json", Authorization: `Bearer ${accessToken}` }
}

async function requestPayloadJson(
  endpoint: URL,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<PayloadJsonResult> {
  try {
    const response = await fetcher(endpoint, init)
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, value: await response.json().catch(() => null) }
  } catch (error) {
    return error instanceof DOMException && error.name === "TimeoutError"
      ? { kind: "timeout", ok: false }
      : { kind: "network", ok: false }
  }
}

function readInit(accessToken: string, timeoutMs = REQUEST_TIMEOUT_MS): RequestInit {
  return {
    cache: "no-store",
    headers: requestHeaders(accessToken),
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  }
}

function mutationInit(accessToken: string, method: "PATCH" | "POST", body: unknown): RequestInit {
  return {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: { ...requestHeaders(accessToken), "Content-Type": "application/json" },
    method,
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }
}

function readError(response: Exclude<PayloadJsonResult, { ok: true }>): ReviewReadError {
  if ("kind" in response) return response.kind === "timeout" ? "timeout" : "unavailable"
  if (response.status === 401) return "unauthorized"
  if (response.status === 403) return "forbidden"
  return "unavailable"
}

function changeError(response: Exclude<PayloadJsonResult, { ok: true }>): ReviewChangeError {
  if ("kind" in response) return response.kind === "timeout" ? "timeout" : "unavailable"
  if (response.status === 400 || response.status === 422) return "invalid-input"
  if (response.status === 401) return "unauthorized"
  if (response.status === 403) return "forbidden"
  if (response.status === 404) return "not-found"
  if (response.status === 409) return "conflict"
  return "unavailable"
}

function historyError(response: Exclude<PayloadJsonResult, { ok: true }>): ReviewHistoryError {
  if ("kind" in response) return response.kind === "timeout" ? "timeout" : "unavailable"
  if (response.status === 401) return "unauthorized"
  if (response.status === 403) return "forbidden"
  if (response.status === 404) return "not-found"
  if (response.status === 409) return "history-changed"
  return "unavailable"
}

function relationId(value: z.infer<typeof relationSchema>) {
  return typeof value === "string" ? value : value.id
}

function payloadRelationshipId(value: string) {
  const numericValue = Number(value)
  return Number.isSafeInteger(numericValue) && numericValue > 0 && String(numericValue) === value
    ? numericValue
    : value
}

function treatment(value: z.infer<typeof relationSchema>): ReviewTreatmentOption | null {
  return typeof value === "string" ? null : { id: value.id, label: value.name }
}

function initials(author: string) {
  const value = author
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
  return value || "AP"
}

function mapResponse(raw: z.infer<typeof rawResponseSchema>): ReviewResponseWorkflow {
  const pending =
    raw.pendingResponse?.body && raw.pendingResponse.submittedAt
      ? { body: raw.pendingResponse.body, submittedAt: raw.pendingResponse.submittedAt }
      : undefined
  const published =
    raw.publishedResponse?.body && raw.publishedResponse.approvedAt && !raw.publishedResponse.isBlocked
      ? { approvedAt: raw.publishedResponse.approvedAt, body: raw.publishedResponse.body }
      : undefined

  return {
    id: raw.id,
    moderatedAt: raw.moderatedAt ?? undefined,
    pending,
    published,
    status: raw.moderationStatus,
  }
}

function mapAppeal(raw: z.infer<typeof rawAppealSchema>): ReviewAppealWorkflow {
  return {
    createdAt: raw.createdAt,
    decidedAt: raw.decidedAt ?? undefined,
    decisionReason: raw.decisionReason ?? undefined,
    details: raw.details,
    id: raw.id,
    reason: raw.reason,
    status: raw.status,
  }
}

function mapReview(
  raw: z.infer<typeof rawReviewSchema>,
  responses: ReadonlyMap<string, ReviewResponseWorkflow>,
  appeals: ReadonlyMap<string, ReviewAppealWorkflow>,
): ClinicReviewRecord | null {
  const relatedTreatment = treatment(raw.treatment)
  if (!relatedTreatment) return null

  const author = raw.publicAuthorName ?? "Anonymous patient"
  const publicText =
    raw.withdrawalState === "withdrawn" ||
    raw.publicMeasure === "removed" ||
    raw.publicMeasure === "placeholder"
      ? undefined
      : raw.publicMeasure === "redaction"
        ? (raw.publicComment ?? undefined)
        : (raw.comment ?? undefined)

  return {
    appeal: appeals.get(raw.id),
    author,
    id: raw.id,
    initials: initials(author),
    publicMeasure: raw.publicMeasure,
    publicNotice: raw.publicNotice ?? undefined,
    publicText,
    rating: raw.starRating,
    response: responses.get(raw.id),
    reviewDate: raw.reviewDate,
    treatment: relatedTreatment,
    withdrawalState: raw.withdrawalState,
    withdrawnAt: raw.withdrawnAt ?? undefined,
  }
}

function listEndpoint(filters: ReviewListFilters, page: number) {
  const endpoint = endpointFor("/api/reviews")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", String(PAGE_LIMIT))
  endpoint.searchParams.set("page", String(page))
  endpoint.searchParams.set("sort", "-reviewDate")

  if (filters.period !== "all") {
    const threshold = new Date(Date.now() - Number(filters.period) * 86_400_000).toISOString()
    endpoint.searchParams.set("where[reviewDate][greater_than_equal]", threshold)
  }
  if (filters.rating !== "all") endpoint.searchParams.set("where[starRating][equals]", filters.rating)
  if (filters.treatment !== "all") {
    endpoint.searchParams.set("where[treatment][equals]", filters.treatment)
  }
  if (filters.visibility === "published") {
    endpoint.searchParams.set("where[withdrawalState][equals]", "active")
    endpoint.searchParams.set("where[publicMeasure][not_equals]", "removed")
  }
  if (filters.visibility === "moderated") {
    endpoint.searchParams.set("where[publicMeasure][in]", "context,redaction,placeholder,removed")
  }
  if (filters.visibility === "removed") {
    endpoint.searchParams.set("where[publicMeasure][equals]", "removed")
  }
  if (filters.visibility === "withdrawn") {
    endpoint.searchParams.set("where[withdrawalState][equals]", "withdrawn")
  }
  return endpoint
}

function workflowsEndpoint(collection: "reviewAppeals" | "reviewResponses", reviewIds: readonly string[]) {
  const endpoint = endpointFor(`/api/${collection}`)
  endpoint.searchParams.set("depth", "0")
  endpoint.searchParams.set("limit", String(Math.max(reviewIds.length, 1)))
  endpoint.searchParams.set("pagination", "false")
  endpoint.searchParams.set("where[review][in]", reviewIds.join(","))
  return endpoint
}

async function loadWorkflows(accessToken: string, reviewIds: readonly string[], fetcher: typeof fetch) {
  if (reviewIds.length === 0) {
    return {
      appeals: new Map<string, ReviewAppealWorkflow>(),
      ok: true as const,
      responses: new Map<string, ReviewResponseWorkflow>(),
    } as const
  }

  const [responseResult, appealResult] = await Promise.all([
    requestPayloadJson(workflowsEndpoint("reviewResponses", reviewIds), readInit(accessToken), fetcher),
    requestPayloadJson(workflowsEndpoint("reviewAppeals", reviewIds), readInit(accessToken), fetcher),
  ])
  if (!responseResult.ok) return { error: readError(responseResult), ok: false } as const
  if (!appealResult.ok) return { error: readError(appealResult), ok: false } as const

  const responses = rawResponseListSchema.safeParse(responseResult.value)
  const appeals = rawAppealListSchema.safeParse(appealResult.value)
  if (!responses.success || !appeals.success) return { error: "invalid-data", ok: false } as const

  return {
    appeals: new Map(appeals.data.docs.map((entry) => [entry.review, mapAppeal(entry)])),
    ok: true as const,
    responses: new Map(responses.data.docs.map((entry) => [entry.review, mapResponse(entry)])),
  } as const
}

async function loadSummary(accessToken: string, fetcher: typeof fetch) {
  const ratings: number[] = []
  const treatments = new Map<string, ReviewTreatmentOption>()
  let page = 1
  let pageCount = 1
  const startedAt = Date.now()

  do {
    const remainingTime = SUMMARY_TOTAL_TIMEOUT_MS - (Date.now() - startedAt)
    if (remainingTime <= 0) return { error: "timeout", ok: false } as const
    const endpoint = endpointFor("/api/reviews")
    endpoint.searchParams.set("depth", "1")
    endpoint.searchParams.set("limit", String(SUMMARY_PAGE_LIMIT))
    endpoint.searchParams.set("page", String(page))
    endpoint.searchParams.set("sort", "-reviewDate")
    const result = await requestPayloadJson(
      endpoint,
      readInit(accessToken, Math.min(REQUEST_TIMEOUT_MS, remainingTime)),
      fetcher,
    )
    if (!result.ok) return { error: readError(result), ok: false } as const
    const parsed = rawReviewListSchema.safeParse(result.value)
    if (!parsed.success) return { error: "invalid-data", ok: false } as const

    for (const review of parsed.data.docs) {
      ratings.push(review.starRating)
      const option = treatment(review.treatment)
      if (option) treatments.set(option.id, option)
    }
    pageCount = Math.max(parsed.data.totalPages, 1)
    if (pageCount > SUMMARY_MAX_PAGES) return { error: "invalid-data", ok: false } as const
    page += 1
  } while (page <= pageCount)

  const counts = new Map([1, 2, 3, 4, 5].map((stars) => [stars, 0]))
  for (const rating of ratings) counts.set(rating, (counts.get(rating) ?? 0) + 1)
  const total = ratings.length
  const rating = total === 0 ? 0 : ratings.reduce((sum, value) => sum + value, 0) / total
  return {
    ok: true,
    value: {
      distribution: [5, 4, 3, 2, 1].map((stars) => ({
        count: counts.get(stars) ?? 0,
        percent: total === 0 ? 0 : ((counts.get(stars) ?? 0) / total) * 100,
        stars: stars as 1 | 2 | 3 | 4 | 5,
      })),
      rating: Number(rating.toFixed(1)),
      total,
      treatments: [...treatments.values()].sort((left, right) => left.label.localeCompare(right.label)),
    },
  } as const
}

async function loadReviewRecord(
  accessToken: string,
  reviewId: string,
  fetcher: typeof fetch,
): Promise<ReviewProviderResult<ClinicReviewRecord, ReviewChangeError>> {
  const reviewResult = await requestPayloadJson(
    endpointFor(`/api/reviews/${encodeURIComponent(reviewId)}?depth=1`),
    readInit(accessToken),
    fetcher,
  )
  if (!reviewResult.ok) return { error: changeError(reviewResult), ok: false }
  const review = rawReviewSchema.safeParse(reviewResult.value)
  if (!review.success) return { error: "invalid-data", ok: false }
  const workflows = await loadWorkflows(accessToken, [review.data.id], fetcher)
  if (!workflows.ok) return workflows
  const mapped = mapReview(review.data, workflows.responses, workflows.appeals)
  return mapped ? { ok: true, value: mapped } : { error: "invalid-data", ok: false }
}

function publicationEntry(
  value: z.infer<typeof rawPublicationHistorySchema>["data"]["versions"][number],
  hideOriginalText: boolean,
): ReviewPublicationHistoryEntry {
  return {
    actorType: value.actorType,
    id: value.id,
    publicAuthorName: value.publicAuthorName ?? undefined,
    publicMeasure: value.publicMeasure,
    publicNotice: value.publicNotice ?? undefined,
    publicText: hideOriginalText ? undefined : (value.publicText ?? undefined),
    recordedAt: value.recordedAt,
    reviewDate: value.reviewDate,
    starRating: value.starRating,
    status: value.status,
    withdrawalSource: value.withdrawalSource ?? undefined,
    withdrawalState: value.withdrawalState,
    withdrawnAt: value.withdrawnAt ?? undefined,
  }
}

export function createPayloadReviewProvider(
  accessToken: string,
  _clinicId: string,
  fetcher: typeof fetch = fetch,
): ReviewProvider {
  return {
    async loadHistory(reviewId, cursor) {
      const reviewResult = await requestPayloadJson(
        endpointFor(`/api/reviews/${encodeURIComponent(reviewId)}?depth=1`),
        readInit(accessToken),
        fetcher,
      )
      if (!reviewResult.ok) return { error: historyError(reviewResult), ok: false }
      const currentReview = rawReviewSchema.safeParse(reviewResult.value)
      if (!currentReview.success || currentReview.data.id !== reviewId) {
        return { error: "invalid-data", ok: false }
      }
      const hideOriginalText =
        currentReview.data.withdrawalState === "withdrawn" ||
        currentReview.data.publicMeasure === "removed" ||
        currentReview.data.publicMeasure === "placeholder"
      const publicationEndpoint = endpointFor(
        `/api/reviews/${encodeURIComponent(reviewId)}/publication-history`,
      )
      publicationEndpoint.searchParams.set("limit", "25")
      if (cursor) publicationEndpoint.searchParams.set("cursor", cursor)
      const publicationResult = await requestPayloadJson(publicationEndpoint, readInit(accessToken), fetcher)
      if (!publicationResult.ok) return { error: historyError(publicationResult), ok: false }
      const publication = rawPublicationHistorySchema.safeParse(publicationResult.value)
      if (!publication.success || publication.data.data.reviewId !== reviewId) {
        return { error: "invalid-data", ok: false }
      }

      const versionEndpoint = (collection: "reviewAppeals" | "reviewResponses") => {
        const endpoint = endpointFor(`/api/${collection}/versions`)
        endpoint.searchParams.set("depth", "0")
        endpoint.searchParams.set("limit", "1000")
        endpoint.searchParams.set("pagination", "false")
        endpoint.searchParams.set("sort", "-createdAt")
        endpoint.searchParams.set("where[version.review][equals]", reviewId)
        return endpoint
      }
      const [responseResult, appealResult] = await Promise.all([
        requestPayloadJson(versionEndpoint("reviewResponses"), readInit(accessToken), fetcher),
        requestPayloadJson(versionEndpoint("reviewAppeals"), readInit(accessToken), fetcher),
      ])
      if (!responseResult.ok) return { error: historyError(responseResult), ok: false }
      if (!appealResult.ok) return { error: historyError(appealResult), ok: false }
      const responseVersions = rawResponseVersionListSchema.safeParse(responseResult.value)
      const appealVersions = rawAppealVersionListSchema.safeParse(appealResult.value)
      if (!responseVersions.success || !appealVersions.success) {
        return { error: "invalid-data", ok: false }
      }

      const value: ReviewHistorySnapshot = {
        appeal: appealVersions.data.docs.map(({ createdAt, id, version }) => ({
          action: version.lastAction,
          actorType: version.lastActorType,
          decidedAt: version.decidedAt ?? undefined,
          decisionReason: version.decisionReason ?? undefined,
          id,
          recordedAt: createdAt,
          status: version.status,
        })),
        publication: {
          entries: publication.data.data.versions.map((entry) => publicationEntry(entry, hideOriginalText)),
          hasNextPage: publication.data.data.pagination.hasNextPage,
          nextCursor: publication.data.data.pagination.nextCursor ?? undefined,
        },
        response: responseVersions.data.docs.map(({ createdAt, id, version }) => ({
          action: version.lastAction,
          actorType: version.lastActorType,
          id,
          pendingBody: version.pendingResponse?.body ?? undefined,
          publishedBody: version.publishedResponse?.isBlocked
            ? undefined
            : (version.publishedResponse?.body ?? undefined),
          recordedAt: createdAt,
          status: version.moderationStatus,
        })),
        reviewId,
      }
      return { ok: true, value }
    },

    async loadReviews(filters, requestedPage) {
      const page = Math.max(1, requestedPage)
      const [listResult, summaryResult] = await Promise.all([
        requestPayloadJson(listEndpoint(filters, page), readInit(accessToken), fetcher),
        loadSummary(accessToken, fetcher),
      ])
      if (!listResult.ok) return { error: readError(listResult), ok: false }
      if (!summaryResult.ok) return summaryResult
      const list = rawReviewListSchema.safeParse(listResult.value)
      if (!list.success) return { error: "invalid-data", ok: false }

      const reviewIds = list.data.docs.map((review) => review.id)
      const workflows = await loadWorkflows(accessToken, reviewIds, fetcher)
      if (!workflows.ok) return workflows
      const items = list.data.docs.map((review) => mapReview(review, workflows.responses, workflows.appeals))
      if (items.some((review) => review === null)) return { error: "invalid-data", ok: false }

      const snapshot: ReviewsSourceSnapshot = {
        page: {
          items: items.filter((review): review is ClinicReviewRecord => review !== null),
          limit: list.data.limit || PAGE_LIMIT,
          page: list.data.page ?? page,
          pageCount: Math.max(list.data.totalPages, 1),
          total: list.data.totalDocs,
        },
        referenceTime: new Date().toISOString(),
        summary: {
          distribution: summaryResult.value.distribution,
          rating: summaryResult.value.rating,
          total: summaryResult.value.total,
        },
        treatments: summaryResult.value.treatments,
      }
      return { ok: true, value: snapshot }
    },

    async submitAppeal(reviewId, submission) {
      const current = await loadReviewRecord(accessToken, reviewId, fetcher)
      if (!current.ok) return current
      if (current.value.appeal) return { error: "conflict", ok: false }
      const result = await requestPayloadJson(
        mutationEndpoint("/api/reviewAppeals"),
        mutationInit(accessToken, "POST", {
          review: payloadRelationshipId(reviewId),
          ...submission,
        }),
        fetcher,
      )
      if (!result.ok) return { error: changeError(result), ok: false }
      const parsed = z.union([rawAppealSchema, z.object({ doc: rawAppealSchema })]).safeParse(result.value)
      if (!parsed.success) return { error: "invalid-data", ok: false }
      const appeal = "doc" in parsed.data ? parsed.data.doc : parsed.data
      return { ok: true, value: { ...current.value, appeal: mapAppeal(appeal) } }
    },

    async submitResponse(reviewId, body) {
      const current = await loadReviewRecord(accessToken, reviewId, fetcher)
      if (!current.ok) return current
      if (!canSubmitReviewResponse(current.value)) return { error: "conflict", ok: false }
      const existing = current.value.response
      const endpoint = existing
        ? mutationEndpoint(`/api/reviewResponses/${encodeURIComponent(existing.id)}`)
        : mutationEndpoint("/api/reviewResponses")
      const result = await requestPayloadJson(
        endpoint,
        mutationInit(
          accessToken,
          existing ? "PATCH" : "POST",
          existing
            ? { pendingResponse: { body } }
            : { pendingResponse: { body }, review: payloadRelationshipId(reviewId) },
        ),
        fetcher,
      )
      if (!result.ok) return { error: changeError(result), ok: false }
      const parsed = z
        .union([rawResponseSchema, z.object({ doc: rawResponseSchema })])
        .safeParse(result.value)
      if (!parsed.success) return { error: "invalid-data", ok: false }
      const response = "doc" in parsed.data ? parsed.data.doc : parsed.data
      return { ok: true, value: { ...current.value, response: mapResponse(response) } }
    },
  }
}
