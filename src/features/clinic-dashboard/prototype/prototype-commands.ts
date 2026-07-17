import type { ClinicProfileCommands } from "@/features/clinic-dashboard/clinic-profile/public"
import { createPendingReviewResponse, type ReviewCommands } from "@/features/clinic-dashboard/reviews/public"

const prototypeTimestamp = "2023-10-16T12:00:00.000Z"
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
  submitReviewAppeal: async (review, reason, detail) =>
    resolvePrototypeValue({
      ...review,
      notice: `Appeal submitted. ${reason}: ${detail.trim()} A moderation response is expected within three to five working days.`,
      revision: review.revision + 1,
      status: "Under review" as const,
    }),
}
