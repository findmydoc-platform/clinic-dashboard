import type { ReviewResponseHistoryEntry } from "./review-source"

export function isEditedResponseHistoryEntry(entry: ReviewResponseHistoryEntry) {
  return entry.action === "pending_edited" || entry.action === "revision_submitted"
}
