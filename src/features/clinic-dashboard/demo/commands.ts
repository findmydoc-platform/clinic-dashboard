import type { ClinicProfileCommands } from "@/features/clinic-dashboard/clinic-profile/public"
import {
  createPendingReviewResponse,
  createReviewAppealCase,
  markReviewAppealUnderReview,
  type ReviewCommands,
} from "@/features/clinic-dashboard/reviews/public"

const demoTimestamp = "2026-07-19T10:00:00.000Z"
const demoAppealReviewTimestamp = "2026-07-19T10:05:00.000Z"
const demoLatencyMs = 240

const resolveDemoValue = async <Value>(value: Value) => {
  await new Promise((done) => setTimeout(done, demoLatencyMs))
  return value
}

export const clinicProfileDemoCommands: ClinicProfileCommands = {
  createClinicProfileEntityId: (kind) => `${kind}-${globalThis.crypto.randomUUID()}`,
  saveClinicProfile: async (profile) =>
    resolveDemoValue({
      ...profile,
      revision: profile.revision + 1,
      updatedAt: demoTimestamp,
    }),
}

export const reviewDemoCommands: ReviewCommands = {
  markReviewAppealUnderReview: async (review) => {
    if (!review.appealCase) throw new Error("An appeal case is required.")

    return resolveDemoValue({
      ...review,
      appealCase: markReviewAppealUnderReview(review.appealCase, demoAppealReviewTimestamp),
      revision: review.revision + 1,
      status: "Under review" as const,
    })
  },
  saveReviewNote: async (review, note) =>
    resolveDemoValue({
      ...review,
      internalNotes: [...review.internalNotes, note.trim()],
      revision: review.revision + 1,
    }),
  submitReviewResponseForModeration: async (review, response) =>
    resolveDemoValue({
      ...review,
      pendingResponse: createPendingReviewResponse(response, demoTimestamp),
      revision: review.revision + 1,
    }),
  submitReviewAppeal: async (review, reason, detail) => {
    if (review.appealCase) throw new Error("This review already has an appeal case.")

    return resolveDemoValue({
      ...review,
      appealCase: createReviewAppealCase({
        detail,
        reason,
        reviewId: review.id,
        submittedAt: demoTimestamp,
      }),
      revision: review.revision + 1,
    })
  },
}
