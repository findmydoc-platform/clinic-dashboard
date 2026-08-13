import { describe, expect, it } from "vitest"
import { isEditedResponseHistoryEntry } from "@/features/clinic-dashboard/reviews/model/review-history"
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
  it("marks clinic edits and submitted revisions as edited", () => {
    expect(isEditedResponseHistoryEntry({ ...submitted, action: "pending_edited" })).toBe(true)
    expect(isEditedResponseHistoryEntry({ ...submitted, action: "revision_submitted" })).toBe(true)
  })

  it("does not mark an initial submission as edited", () => {
    expect(isEditedResponseHistoryEntry(submitted)).toBe(false)
  })
})
