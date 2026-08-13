import { describe, expect, it } from "vitest"
import { isSupersededResponseHistoryEntry } from "@/features/clinic-dashboard/reviews/model/review-history"
import type { ReviewResponseHistoryEntry } from "@/features/clinic-dashboard/reviews/model/review-source"

const submitted: ReviewResponseHistoryEntry = {
  action: "submitted",
  actorType: "clinic_staff",
  id: "submitted",
  pendingBody: "Thank you for the feedback. We are reviewing it with our team.",
  recordedAt: "2026-01-21T12:30:00.000Z",
  status: "pending",
}

describe("review response history", () => {
  it("marks an older pending submission as superseded by a newer clinic edit", () => {
    const entries: readonly ReviewResponseHistoryEntry[] = [
      {
        ...submitted,
        action: "pending_edited",
        id: "edited",
        recordedAt: "2026-01-21T13:00:00.000Z",
      },
      submitted,
    ]

    expect(isSupersededResponseHistoryEntry(entries, 0)).toBe(false)
    expect(isSupersededResponseHistoryEntry(entries, 1)).toBe(true)
  })

  it("keeps a resolved pending version historical instead of calling it superseded", () => {
    const entries: readonly ReviewResponseHistoryEntry[] = [
      {
        action: "approved",
        actorType: "platform_staff",
        id: "approved",
        publishedBody: submitted.pendingBody,
        recordedAt: "2026-01-21T14:00:00.000Z",
        status: "approved",
      },
      submitted,
    ]

    expect(isSupersededResponseHistoryEntry(entries, 1)).toBe(false)
  })
})
