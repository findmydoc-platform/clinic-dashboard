import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import { reviewAppealSubmissionSchema, reviewResponseSubmissionSchema } from "../model/review-source-schema"
import { reviewPeriodFilters, reviewRatingFilters, reviewVisibilityFilters } from "../model/review-source"
import type {
  ReviewChangeError,
  ReviewHistoryError,
  ReviewProviderFactory,
  ReviewReadError,
} from "./review-provider"

const reviewIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const querySchema = z
  .object({
    page: z.coerce.number().int().positive().max(10_000).default(1),
    period: z.enum(reviewPeriodFilters).default("all"),
    rating: z.enum(reviewRatingFilters).default("all"),
    treatment: z.string().trim().min(1).max(128).default("all"),
    visibility: z.enum(reviewVisibilityFilters).default("all"),
  })
  .strict()
const historyQuerySchema = z.object({ cursor: z.string().min(1).max(2_048).optional() }).strict()
const MAX_BODY_BYTES = 16 * 1024

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

function queryObject(request: NextRequest) {
  return Object.fromEntries(request.nextUrl.searchParams.entries())
}

async function readJson(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const size = Number(contentLength)
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_BODY_BYTES) return null
  }
  const raw = await request.text().catch(() => "")
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function accessError(status: string) {
  if (status === "denied") return privateJson({ code: "REVIEW_ACCESS_DENIED" }, 403)
  if (status === "temporarily-unavailable") return privateJson({ code: "REVIEW_SERVICE_UNAVAILABLE" }, 503)
  return privateJson({ code: "REVIEW_UNAUTHORIZED" }, 401)
}

function readError(error: ReviewReadError) {
  if (error === "unauthorized") return privateJson({ code: "REVIEW_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "REVIEW_ACCESS_DENIED" }, 403)
  if (error === "timeout") return privateJson({ code: "REVIEW_UPSTREAM_TIMEOUT" }, 504)
  return privateJson({ code: "REVIEW_SERVICE_UNAVAILABLE" }, 502)
}

function changeError(error: ReviewChangeError) {
  if (error === "invalid-input") return privateJson({ code: "INVALID_INPUT" }, 400)
  if (error === "unauthorized") return privateJson({ code: "REVIEW_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "REVIEW_ACCESS_DENIED" }, 403)
  if (error === "not-found") return privateJson({ code: "REVIEW_NOT_FOUND" }, 404)
  if (error === "conflict") return privateJson({ code: "REVIEW_WORKFLOW_CONFLICT" }, 409)
  if (error === "timeout") return privateJson({ code: "REVIEW_UPSTREAM_TIMEOUT" }, 504)
  return privateJson({ code: "REVIEW_SERVICE_UNAVAILABLE" }, 502)
}

function historyError(error: ReviewHistoryError) {
  if (error === "history-changed") return privateJson({ code: "REVIEW_HISTORY_CHANGED" }, 409)
  return error === "not-found" ? privateJson({ code: "REVIEW_NOT_FOUND" }, 404) : readError(error)
}

async function withAccess(
  request: NextRequest,
  factory: ReviewProviderFactory,
  operation: (provider: ReturnType<ReviewProviderFactory>) => Promise<NextResponse>,
) {
  const authorization = await resolveClinicDashboardRouteAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessError(authorization.status))
  }
  try {
    const response = await operation(factory(authorization.accessToken, authorization.clinicId))
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "REVIEW_SERVICE_UNAVAILABLE" }, 502))
  }
}

export async function handleReviewListLoad(request: NextRequest, factory: ReviewProviderFactory) {
  const input = querySchema.safeParse(queryObject(request))
  if (!input.success) return privateJson({ code: "INVALID_INPUT" }, 400)
  const { page, ...filters } = input.data
  return withAccess(request, factory, async (provider) => {
    const result = await provider.loadReviews(filters, page)
    return result.ok ? privateJson(result.value) : readError(result.error)
  })
}

export async function handleReviewResponseSubmit(
  request: NextRequest,
  reviewIdValue: string,
  factory: ReviewProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const reviewId = reviewIdSchema.safeParse(reviewIdValue)
  const input = reviewResponseSubmissionSchema.safeParse(await readJson(request))
  if (!reviewId.success || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)
  return withAccess(request, factory, async (provider) => {
    const result = await provider.submitResponse(reviewId.data, input.data.body)
    return result.ok ? privateJson(result.value) : changeError(result.error)
  })
}

export async function handleReviewAppealSubmit(
  request: NextRequest,
  reviewIdValue: string,
  factory: ReviewProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)
  const reviewId = reviewIdSchema.safeParse(reviewIdValue)
  const input = reviewAppealSubmissionSchema.safeParse(await readJson(request))
  if (!reviewId.success || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)
  return withAccess(request, factory, async (provider) => {
    const result = await provider.submitAppeal(reviewId.data, input.data)
    return result.ok ? privateJson(result.value) : changeError(result.error)
  })
}

export async function handleReviewHistoryLoad(
  request: NextRequest,
  reviewIdValue: string,
  factory: ReviewProviderFactory,
) {
  const reviewId = reviewIdSchema.safeParse(reviewIdValue)
  const input = historyQuerySchema.safeParse(queryObject(request))
  if (!reviewId.success || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)
  return withAccess(request, factory, async (provider) => {
    const result = await provider.loadHistory(reviewId.data, input.data.cursor)
    return result.ok ? privateJson(result.value) : historyError(result.error)
  })
}
