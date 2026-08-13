import type { ReviewResponseHistoryEntry } from "./review-source"

export function isSupersededResponseHistoryEntry(
  entries: readonly ReviewResponseHistoryEntry[],
  index: number,
) {
  const entry = entries[index]
  if (!entry || index === 0 || entry.status !== "pending") return false

  return entries
    .slice(0, index)
    .some(({ action }) => action === "pending_edited" || action === "revision_submitted")
}
