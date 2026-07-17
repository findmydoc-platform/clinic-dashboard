import type { ClinicProfileCommands } from "@/features/clinic-dashboard/clinic-profile/public"
import type { ReviewCommands } from "@/features/clinic-dashboard/reviews/public"
import type { SupportCommands } from "@/features/clinic-dashboard/support/public"

export type ClinicDashboardPrototypeCommands = ClinicProfileCommands & ReviewCommands & SupportCommands

const prototypeTimestamp = "2023-10-16T12:00:00.000Z"

function createClinicDashboardPrototypeCommands(latencyMs = 240): ClinicDashboardPrototypeCommands {
  const resolve = async <Value>(value: Value) => {
    if (latencyMs > 0) await new Promise((done) => setTimeout(done, latencyMs))
    return value
  }

  return {
    createClinicProfileEntityId: (kind) => `${kind}-${globalThis.crypto.randomUUID()}`,
    saveClinicProfile: async (profile) =>
      resolve({
        ...profile,
        revision: profile.revision + 1,
        updatedAt: prototypeTimestamp,
      }),
    saveReviewNote: async (review, note) =>
      resolve({
        ...review,
        internalNotes: [...review.internalNotes, note.trim()],
        revision: review.revision + 1,
      }),
    saveReviewResponse: async (review, response) =>
      resolve({
        ...review,
        response: response.trim(),
        revision: review.revision + 1,
        status: "Answered" as const,
      }),
    submitReviewAppeal: async (review, reason, detail) =>
      resolve({
        ...review,
        notice: `Appeal submitted. ${reason}: ${detail.trim()} A moderation response is expected within three to five working days.`,
        revision: review.revision + 1,
        status: "Under review" as const,
      }),
    submitSupportRequest: async () =>
      resolve({
        expectedResponse: "within one business day",
        ticketId: "FMD-1042",
      }),
  }
}

export const clinicDashboardPrototypeCommands = createClinicDashboardPrototypeCommands()
