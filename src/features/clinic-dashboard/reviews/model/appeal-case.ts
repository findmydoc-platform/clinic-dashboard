const reviewAppealReasons = ["Incorrect clinic", "Inappropriate content", "Privacy concern"] as const

export const reviewAppealCaseStatuses = ["submitted", "under-review"] as const
export const reviewAppealEventTypes = ["appeal-submitted", "appeal-status-changed"] as const

export type ReviewAppealReason = (typeof reviewAppealReasons)[number]
export type ReviewAppealCaseStatus = (typeof reviewAppealCaseStatuses)[number]
export type ReviewAppealEventType = (typeof reviewAppealEventTypes)[number]

export type ReviewAppealEvent =
  | Readonly<{
      id: string
      occurredAt: string
      status: "submitted"
      type: "appeal-submitted"
    }>
  | Readonly<{
      fromStatus: "submitted"
      id: string
      occurredAt: string
      toStatus: "under-review"
      type: "appeal-status-changed"
    }>

export type ReviewAppealCase = Readonly<{
  detail: string
  events: readonly ReviewAppealEvent[]
  reason: ReviewAppealReason
  reference: string
  status: ReviewAppealCaseStatus
  submittedAt: string
  updatedAt: string
}>

type CreateReviewAppealCaseInput = Readonly<{
  detail: string
  reason: ReviewAppealReason
  reviewId: string
  submittedAt: string
}>

function assertIsoTimestamp(timestamp: string) {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== timestamp) {
    throw new Error("Appeal case timestamps must use canonical ISO format.")
  }
}

export function createReviewAppealReference(reviewId: string) {
  const normalizedReviewId = reviewId.trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalizedReviewId)) {
    throw new Error("An appeal case requires a stable review ID.")
  }

  return `APPEAL-${normalizedReviewId.toUpperCase()}`
}

export function createReviewAppealCase({
  detail,
  reason,
  reviewId,
  submittedAt,
}: CreateReviewAppealCaseInput): ReviewAppealCase {
  const trimmedDetail = detail.trim()
  if (trimmedDetail.length < 10) {
    throw new Error("An appeal case requires at least 10 detail characters.")
  }
  assertIsoTimestamp(submittedAt)

  const reference = createReviewAppealReference(reviewId)

  return {
    detail: trimmedDetail,
    events: [
      {
        id: `${reference}-EVENT-1`,
        occurredAt: submittedAt,
        status: "submitted",
        type: "appeal-submitted",
      },
    ],
    reason,
    reference,
    status: "submitted",
    submittedAt,
    updatedAt: submittedAt,
  }
}

export function markReviewAppealUnderReview(
  appealCase: ReviewAppealCase,
  changedAt: string,
): ReviewAppealCase {
  if (appealCase.status !== "submitted") {
    throw new Error("Only a submitted appeal case can be marked as under review.")
  }
  assertIsoTimestamp(changedAt)
  if (changedAt <= appealCase.updatedAt) {
    throw new Error("Appeal case events must remain in chronological order.")
  }

  return {
    ...appealCase,
    events: [
      ...appealCase.events,
      {
        fromStatus: "submitted",
        id: `${appealCase.reference}-EVENT-${appealCase.events.length + 1}`,
        occurredAt: changedAt,
        toStatus: "under-review",
        type: "appeal-status-changed",
      },
    ],
    status: "under-review",
    updatedAt: changedAt,
  }
}

export function cloneReviewAppealCase(appealCase: ReviewAppealCase): ReviewAppealCase {
  return {
    ...appealCase,
    events: appealCase.events.map((event) => ({ ...event })),
  }
}
