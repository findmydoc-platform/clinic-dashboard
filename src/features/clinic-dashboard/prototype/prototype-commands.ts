import type { ClinicProfileCommands } from "@/features/clinic-dashboard/clinic-profile/public"
import {
  createPendingReviewResponse,
  createReviewAppealCase,
  markReviewAppealUnderReview,
  type ReviewCommands,
} from "@/features/clinic-dashboard/reviews/public"

const prototypeTimestamp = "2023-10-16T12:00:00.000Z"
const prototypeAppealReviewTimestamp = "2023-10-16T12:05:00.000Z"
const prototypeLatencyMs = 240

const resolvePrototypeValue = async <Value>(value: Value) => {
  await new Promise((done) => setTimeout(done, prototypeLatencyMs))
  return value
}

export const clinicProfilePrototypeCommands: ClinicProfileCommands = {
  createClinicProfileEntityId: (kind) => `${kind}-${globalThis.crypto.randomUUID()}`,
  saveClinicProfile: async (profile) =>
    resolvePrototypeValue({
      ...profile,
      revision: profile.revision + 1,
      updatedAt: prototypeTimestamp,
    }),
}

export const reviewPrototypeCommands: ReviewCommands = {
  markReviewAppealUnderReview: async (review) => {
    if (!review.appealCase) throw new Error("An appeal case is required.")

    return resolvePrototypeValue({
      ...review,
      appealCase: markReviewAppealUnderReview(review.appealCase, prototypeAppealReviewTimestamp),
      revision: review.revision + 1,
      status: "Under review" as const,
    })
  },
  saveReviewNote: async (review, note) =>
    resolvePrototypeValue({
      ...review,
      internalNotes: [...review.internalNotes, note.trim()],
      revision: review.revision + 1,
    }),
  submitReviewResponseForModeration: async (review, response) =>
    resolvePrototypeValue({
      ...review,
      pendingResponse: createPendingReviewResponse(response, prototypeTimestamp),
      revision: review.revision + 1,
    }),
  submitReviewAppeal: async (review, reason, detail) => {
    if (review.appealCase) throw new Error("This review already has an appeal case.")

    return resolvePrototypeValue({
      ...review,
      appealCase: createReviewAppealCase({
        detail,
        reason,
        reviewId: review.id,
        submittedAt: prototypeTimestamp,
      }),
      revision: review.revision + 1,
    })
  },
}
