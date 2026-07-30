"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import {
  clinicProfileWeekdayLabels,
  createEmptyClinicProfileOpeningHours,
  type ClinicProfileValidationErrors,
} from "../../model/clinic-profile-editing"
import { clinicProfileWeekdayValues, type ClinicProfileOpeningHours } from "../../model/clinic-profile-source"

type OpeningHoursDialogProps = Readonly<{
  entries?: ClinicProfileOpeningHours
  errors: ClinicProfileValidationErrors
  onOpenChange: (open: boolean) => void
  onSave: (entries: ClinicProfileOpeningHours | undefined) => void
  open: boolean
}>

export function OpeningHoursDialog({ entries, errors, onOpenChange, onSave, open }: OpeningHoursDialogProps) {
  const [isConfigured, setIsConfigured] = useState(Boolean(entries))
  const [draft, setDraft] = useState<ClinicProfileOpeningHours>(
    entries ?? createEmptyClinicProfileOpeningHours(),
  )

  return (
    <Modal
      description="Set the weekly schedule in 24-hour Türkiye local time."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(isConfigured ? draft : undefined)
              onOpenChange(false)
            }}
          >
            Apply hours
          </Button>
        </div>
      }
      contentClassName="sm:py-5"
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-3xl"
      title="Edit opening hours"
    >
      <label className="mb-3 flex items-center gap-3 text-sm font-bold">
        <input
          checked={isConfigured}
          className="size-4 accent-[var(--primary)]"
          onChange={(event) => setIsConfigured(event.currentTarget.checked)}
          type="checkbox"
        />
        Opening hours are configured
      </label>
      {isConfigured ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[8rem_8rem_1fr_1fr] gap-4 bg-[var(--surface)] px-4 py-2 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid"
          >
            <span>Day</span>
            <span>Status</span>
            <span>Opens</span>
            <span>Closes</span>
          </div>
          {clinicProfileWeekdayValues.map((weekday, index) => {
            const entry = draft[weekday]
            const error = errors[`openingHours.${weekday}`]
            return (
              <div
                className={`grid gap-3 p-3 sm:grid-cols-[8rem_8rem_1fr_1fr] sm:items-center sm:gap-4 sm:border-t sm:border-[var(--border)] sm:px-4 sm:py-1.5 ${
                  index === 0 ? "" : "border-t border-[var(--border)]"
                }`}
                key={weekday}
              >
                <strong>{clinicProfileWeekdayLabels[weekday]}</strong>
                <label className="grid gap-1 text-sm font-bold">
                  <span className="sr-only">Status for {clinicProfileWeekdayLabels[weekday]}</span>
                  <Select
                    aria-label={`Status for ${clinicProfileWeekdayLabels[weekday]}`}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        [weekday]:
                          value === "closed"
                            ? { closesAt: "", isClosed: true, opensAt: "" }
                            : { ...current[weekday], isClosed: false },
                      }))
                    }
                    value={entry.isClosed ? "closed" : "open"}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </Select>
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase">
                  <span className="sm:sr-only">Opens</span>
                  <Input
                    aria-label={`Opens for ${clinicProfileWeekdayLabels[weekday]}`}
                    aria-invalid={error ? true : undefined}
                    disabled={entry.isClosed}
                    onValueChange={(opensAt) =>
                      setDraft((current) => ({
                        ...current,
                        [weekday]: { ...current[weekday], opensAt },
                      }))
                    }
                    type="time"
                    value={entry.opensAt}
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase">
                  <span className="sm:sr-only">Closes</span>
                  <Input
                    aria-label={`Closes for ${clinicProfileWeekdayLabels[weekday]}`}
                    aria-invalid={error ? true : undefined}
                    disabled={entry.isClosed}
                    onValueChange={(closesAt) =>
                      setDraft((current) => ({
                        ...current,
                        [weekday]: { ...current[weekday], closesAt },
                      }))
                    }
                    type="time"
                    value={entry.closesAt}
                  />
                </label>
                {error ? (
                  <p
                    className="text-sm font-bold text-[var(--destructive)] sm:col-start-3 sm:col-end-5"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-[var(--surface)] p-4 text-sm">
          The public profile will show opening hours as not configured. This is different from a fully closed
          week.
        </p>
      )}
    </Modal>
  )
}
