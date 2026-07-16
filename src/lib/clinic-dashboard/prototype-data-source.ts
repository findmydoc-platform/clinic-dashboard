import type { ClinicProfileDraft } from "@/lib/clinic-dashboard/profile"
import type { ClinicReview } from "@/lib/clinic-dashboard/reviews"
import type { SupportReceipt, SupportRequest } from "@/lib/clinic-dashboard/support"

export type ClinicDashboardDataSource = {
  saveClinicProfile: (profile: ClinicProfileDraft) => Promise<ClinicProfileDraft>
  saveReviewNote: (review: ClinicReview, note: string) => Promise<ClinicReview>
  saveReviewResponse: (review: ClinicReview, response: string) => Promise<ClinicReview>
  submitReviewAppeal: (review: ClinicReview, reason: string, detail: string) => Promise<ClinicReview>
  submitSupportRequest: (request: SupportRequest) => Promise<SupportReceipt>
}

const fixtureTimestamp = "2023-10-16T12:00:00.000Z"

export function createFixtureClinicDashboardDataSource(latencyMs = 240): ClinicDashboardDataSource {
  const resolve = async <Value>(value: Value) => {
    if (latencyMs > 0) await new Promise((done) => setTimeout(done, latencyMs))
    return value
  }

  return {
    saveClinicProfile: async (profile) =>
      resolve({
        ...profile,
        revision: profile.revision + 1,
        updatedAt: fixtureTimestamp,
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

export const fixtureClinicDashboardDataSource = createFixtureClinicDashboardDataSource()
