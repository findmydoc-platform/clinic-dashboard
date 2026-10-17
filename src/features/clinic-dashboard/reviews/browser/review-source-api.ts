"use client"

import { z } from "zod"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import type { ReviewSourceCommands } from "../model/review-source-commands"
import { ReviewSourceCommandError } from "../model/review-source-commands"
import {
  clinicReviewRecordSchema,
  reviewHistorySnapshotSchema,
  reviewsSourceSnapshotSchema,
} from "../model/review-source-schema"

const errorSchema = z.object({ code: z.string() })

async function parseError(response: Response | undefined) {
  if (!response) return new ReviewSourceCommandError("unknown", "The review service is unavailable.")
  const parsed = errorSchema.safeParse(await response.json().catch(() => null))
  if (response.status === 401) return new ReviewSourceCommandError("unauthorized", "Your session has ended.")
  if (response.status === 403)
    return new ReviewSourceCommandError("forbidden", "Review access is unavailable.")
  if (response.status === 404) return new ReviewSourceCommandError("not-found", "The review was not found.")
  if (response.status === 409 && parsed.success && parsed.data.code === "REVIEW_HISTORY_CHANGED") {
    return new ReviewSourceCommandError("history-changed", "The history changed while it was open.")
  }
  if (response.status === 409) {
    return new ReviewSourceCommandError("conflict", "This workflow has already changed.")
  }
  if (response.status === 504) return new ReviewSourceCommandError("timeout", "The review service timed out.")
  if (response.status === 400 || response.status === 403) {
    return new ReviewSourceCommandError("rejected", "The request could not be accepted.")
  }
  return new ReviewSourceCommandError("unknown", "The review service is unavailable.")
}

async function getJson<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal) {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    credentials: "same-origin",
    redirect: "error",
  }).catch(() => undefined)
  if (!response?.ok) throw await parseError(response)
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw new ReviewSourceCommandError("unknown", "The review response was invalid.")
  return parsed.data
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodType<T>) {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) throw new ReviewSourceCommandError("rejected", "Missing request verification.")
  const response = await fetch(url, {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
    },
    method: "POST",
    redirect: "error",
  }).catch(() => undefined)
  if (!response?.ok) throw await parseError(response)
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) throw new ReviewSourceCommandError("unknown", "The review response was invalid.")
  return parsed.data
}

export function createReviewSourceApiCommands(
  clinicId: string,
  onAccessFailure?: (failure: "unauthorized" | "forbidden") => void,
): ReviewSourceCommands {
  const protect = async <T>(operation: Promise<T>) => {
    try {
      return await operation
    } catch (error) {
      if (
        error instanceof ReviewSourceCommandError &&
        (error.kind === "unauthorized" || error.kind === "forbidden")
      )
        onAccessFailure?.(error.kind)
      throw error
    }
  }
  const endpoint = `/api/dashboard/clinics/${encodeURIComponent(clinicId)}/reviews`
  return {
    async loadReview(reviewId, signal) {
      const timeout = AbortSignal.timeout(8_000)
      const review = await protect(
        getJson(
          `${endpoint}/${encodeURIComponent(reviewId)}`,
          clinicReviewRecordSchema,
          signal ? AbortSignal.any([signal, timeout]) : timeout,
        ),
      )
      if (review.id !== reviewId)
        throw new ReviewSourceCommandError("unknown", "The review response was invalid.")
      return review
    },
    loadHistory(reviewId, cursor) {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
      return protect(
        getJson(`${endpoint}/${encodeURIComponent(reviewId)}/history${query}`, reviewHistorySnapshotSchema),
      )
    },
    loadReviews(filters, page) {
      const query = new URLSearchParams({ ...filters, page: String(page) })
      return protect(getJson(`${endpoint}?${query}`, reviewsSourceSnapshotSchema))
    },
    submitAppeal(reviewId, submission) {
      return protect(
        postJson(`${endpoint}/${encodeURIComponent(reviewId)}/appeal`, submission, clinicReviewRecordSchema),
      )
    },
    submitResponse(reviewId, body) {
      return protect(
        postJson(`${endpoint}/${encodeURIComponent(reviewId)}/response`, { body }, clinicReviewRecordSchema),
      )
    },
  }
}
