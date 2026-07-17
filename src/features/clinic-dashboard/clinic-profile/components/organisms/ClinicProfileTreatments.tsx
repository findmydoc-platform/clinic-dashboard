import { Eye, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicTreatmentView } from "../../model/clinic-profile"
import { RemovalUndoBanner } from "../molecules/RemovalUndoBanner"

type ClinicProfileTreatmentsProps = Readonly<{
  isBusy: boolean
  onCreate: () => void
  onRemove: (id: string) => void
  onTreatmentOpen: (treatment: ClinicTreatmentView) => void
  onUndo: () => void
  showCreateAction: boolean
  showTreatmentActions: boolean
  showTreatmentViewAction: boolean
  treatments: readonly ClinicTreatmentView[]
  undoMessage?: string
}>

export function ClinicProfileTreatments({
  isBusy,
  onCreate,
  onRemove,
  onTreatmentOpen,
  onUndo,
  showCreateAction,
  showTreatmentActions,
  showTreatmentViewAction,
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
        <div className="hidden grid-cols-[minmax(10rem,1fr)_7rem_7rem] gap-3 bg-[var(--surface)] px-4 py-3 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid">
          <span>Treatment</span>
          <span>Price</span>
          <span>Actions</span>
        </div>
        {treatments.map((treatment) => (
          <div
            className="grid gap-2 border-b border-[var(--border)] px-1 py-4 last:border-0 sm:grid-cols-[minmax(10rem,1fr)_7rem_7rem] sm:items-center sm:px-4"
            key={treatment.masterTreatmentId}
          >
            <strong className="text-sm">{treatment.name}</strong>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-bold text-[var(--foreground)] sm:hidden">Price</span>
              <span className="font-bold text-[var(--primary)]">{treatment.price}</span>
            </div>
            {showTreatmentActions ? (
              <div
                aria-label={`Actions for ${treatment.name}`}
                className="flex flex-nowrap items-center gap-1"
                role="group"
              >
                <Button
                  aria-label={`Edit ${treatment.name}`}
                  disabled={isBusy}
                  onClick={() => onTreatmentOpen(treatment)}
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
                  onClick={() => onRemove(treatment.masterTreatmentId)}
                  size="icon"
                  title={`Remove ${treatment.name}`}
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </Button>
              </div>
            ) : showTreatmentViewAction ? (
              <Button
                aria-label={`View ${treatment.name}`}
                className="justify-self-start"
                disabled={isBusy}
                onClick={() => onTreatmentOpen(treatment)}
                size="small"
                title={`View ${treatment.name}`}
                variant="ghost"
              >
                <Eye aria-hidden="true" className="size-4" />
                View
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  )
}
