import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { ClinicReview } from "../../model/review"

type ReviewHistoryDialogProps = Readonly<{
  onClose: () => void
  review: ClinicReview
}>

export function ReviewHistoryDialog({ onClose, review }: ReviewHistoryDialogProps) {
  return (
    <Modal
      description="Review the local prototype history for this review."
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      }
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      open
      title="Review history"
    >
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">Status</dt>
          <dd className="mt-1 font-bold">{review.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">Revision</dt>
          <dd className="mt-1 font-bold">{review.revision}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
            Clinic response
          </dt>
          <dd className="mt-2 rounded-lg bg-[var(--surface)] p-4">
            {review.response ?? "No public response yet."}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
            Internal notes
          </dt>
          <dd className="mt-2 space-y-2">
            {review.internalNotes.length ? (
              review.internalNotes.map((note, index) => (
                <p
                  className="rounded-lg border border-[var(--border)] p-3"
                  key={`${review.id}-note-${index}`}
                >
                  {note}
                </p>
              ))
            ) : (
              <p className="rounded-lg bg-[var(--surface)] p-4">No internal notes yet.</p>
            )}
          </dd>
        </div>
      </dl>
    </Modal>
  )
}
