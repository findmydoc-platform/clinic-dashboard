import { Eye, Pencil, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicTreatmentOffering } from "../../model/clinic-treatment"

const euroFormatter = new Intl.NumberFormat("en", {
  currency: "EUR",
  style: "currency",
})

type ClinicProfileTreatmentsProps = Readonly<{
  isBusy: boolean
  onCreate: () => void
  onRetry: () => void
  onTreatmentOpen: (treatment: ClinicTreatmentOffering) => void
  showCreateAction: boolean
  showTreatmentActions: boolean
  showTreatmentViewAction: boolean
  status: "forbidden" | "ready" | "temporarily-unavailable"
  statusMessage?: string
  treatments: readonly ClinicTreatmentOffering[]
}>

export function ClinicProfileTreatments({
  isBusy,
  onCreate,
  onRetry,
  onTreatmentOpen,
  showCreateAction,
  showTreatmentActions,
  showTreatmentViewAction,
  status,
  statusMessage,
  treatments,
}: ClinicProfileTreatmentsProps) {
  return (
    <Card aria-labelledby="clinic-profile-treatments-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]" id="clinic-profile-treatments-heading">
          Treatments and prices
        </h2>
        {showCreateAction && status === "ready" ? (
          <Button disabled={isBusy} onClick={onCreate} variant="ghost">
            <Plus aria-hidden="true" className="size-4" /> New treatment
          </Button>
        ) : null}
      </div>
      {statusMessage ? (
        <p aria-live="polite" className="px-5 pt-4 text-sm text-[var(--foreground)]" role="status">
          {statusMessage}
        </p>
      ) : null}
      {status !== "ready" ? (
        <div className="grid justify-items-start gap-3 p-5">
          <p className="text-sm text-[var(--foreground)]">
            {status === "forbidden"
              ? "You do not have permission to view clinic treatments."
              : "Clinic treatments could not be loaded."}
          </p>
          {status === "temporarily-unavailable" ? (
            <Button disabled={isBusy} onClick={onRetry} variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" /> Retry
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="p-5">
          <div className="hidden grid-cols-[minmax(10rem,1fr)_7rem_6rem_7rem] gap-3 bg-[var(--surface)] px-4 py-3 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid">
            <span>Treatment</span>
            <span>Price</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {treatments.length === 0 ? (
            <p className="py-6 text-sm text-[var(--foreground)]">No treatments assigned yet.</p>
          ) : null}
          {treatments.map((treatment) => (
            <div
              className="grid gap-3 border-b border-[var(--border)] px-1 py-4 last:border-0 sm:grid-cols-[minmax(10rem,1fr)_7rem_6rem_7rem] sm:items-center sm:px-4"
              key={treatment.id}
            >
              <strong className="text-sm">{treatment.treatment.name}</strong>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-[var(--foreground)] sm:hidden">Price</span>
                <span className="font-bold text-[var(--primary)]">
                  {euroFormatter.format(treatment.price)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--foreground)] sm:hidden">Status</span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                    treatment.active
                      ? "bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "bg-[var(--surface)] text-[var(--foreground)]"
                  }`}
                >
                  {treatment.active ? "Active" : "Inactive"}
                </span>
              </div>
              {showTreatmentActions || showTreatmentViewAction ? (
                <Button
                  aria-label={`${showTreatmentActions ? "Edit" : "View"} ${treatment.treatment.name}`}
                  className="min-h-11 justify-self-start"
                  disabled={isBusy}
                  onClick={() => onTreatmentOpen(treatment)}
                  size={showTreatmentActions ? "icon" : "small"}
                  title={`${showTreatmentActions ? "Edit" : "View"} ${treatment.treatment.name}`}
                  variant="ghost"
                >
                  {showTreatmentActions ? (
                    <Pencil aria-hidden="true" className="size-4" />
                  ) : (
                    <>
                      <Eye aria-hidden="true" className="size-4" />
                      View
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
