import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicTreatment } from "../../model/clinic-profile"
import { RemovalUndoBanner } from "../molecules/RemovalUndoBanner"

type ClinicProfileTreatmentsProps = Readonly<{
  isBusy: boolean
  onCreate: () => void
  onEdit: (treatment: ClinicTreatment) => void
  onMove: (id: string, direction: -1 | 1) => void
  onRemove: (id: string) => void
  onUndo: () => void
  showCreateAction: boolean
  showTreatmentActions: boolean
  treatments: readonly ClinicTreatment[]
  undoMessage?: string
}>

export function ClinicProfileTreatments({
  isBusy,
  onCreate,
  onEdit,
  onMove,
  onRemove,
  onUndo,
  showCreateAction,
  showTreatmentActions,
  treatments,
  undoMessage,
}: ClinicProfileTreatmentsProps) {
  return (
    <Card aria-labelledby="clinic-profile-treatments-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]" id="clinic-profile-treatments-heading">
          Treatments and prices
        </h2>
        {showCreateAction ? (
          <Button disabled={isBusy} onClick={onCreate} variant="ghost">
            <Plus aria-hidden="true" className="size-4" /> New treatment
          </Button>
        ) : null}
      </div>
      {undoMessage ? <RemovalUndoBanner isBusy={isBusy} message={undoMessage} onUndo={onUndo} /> : null}
      <div className="p-5">
        <div className="hidden grid-cols-[minmax(8rem,1fr)_5rem_5rem_12rem] gap-3 bg-[var(--surface)] px-4 py-3 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid">
          <span>Treatment</span>
          <span>Duration</span>
          <span>From</span>
          <span>Actions</span>
        </div>
        {treatments.map((treatment, index) => (
          <div
            className="grid gap-2 border-b border-[var(--border)] px-1 py-4 last:border-0 sm:grid-cols-[minmax(8rem,1fr)_5rem_5rem_12rem] sm:items-center sm:px-4"
            key={treatment.id}
          >
            <strong className="text-sm">{treatment.name}</strong>
            <span className="text-sm text-[var(--foreground)]">{treatment.duration}</span>
            <span className="font-bold text-[var(--primary)]">{treatment.price}</span>
            {showTreatmentActions ? (
              <div
                aria-label={`Actions for ${treatment.name}`}
                className="flex flex-nowrap items-center gap-1"
                role="group"
              >
                <div aria-label={`Reorder ${treatment.name}`} className="flex gap-1" role="group">
                  <Button
                    aria-label={`Move ${treatment.name} up`}
                    disabled={isBusy || index === 0}
                    onClick={() => onMove(treatment.id, -1)}
                    size="icon"
                    title={`Move ${treatment.name} up`}
                    variant="ghost"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Move ${treatment.name} down`}
                    disabled={isBusy || index === treatments.length - 1}
                    onClick={() => onMove(treatment.id, 1)}
                    size="icon"
                    title={`Move ${treatment.name} down`}
                    variant="ghost"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <Button
                  aria-label={`Edit ${treatment.name}`}
                  disabled={isBusy}
                  onClick={() => onEdit(treatment)}
                  size="icon"
                  title={`Edit ${treatment.name}`}
                  variant="ghost"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label={`Remove ${treatment.name}`}
                  className="text-[var(--destructive)] enabled:hover:bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))] enabled:hover:text-[var(--destructive)]"
                  disabled={isBusy}
                  onClick={() => onRemove(treatment.id)}
                  size="icon"
                  title={`Remove ${treatment.name}`}
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}
