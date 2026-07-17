"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import type { ClinicOpeningHours } from "../../model/clinic-profile"

type OpeningHoursDialogProps = Readonly<{
  entries: readonly ClinicOpeningHours[]
  onOpenChange: (open: boolean) => void
  onSave: (entries: ClinicOpeningHours[]) => void
  open: boolean
}>

export function OpeningHoursDialog({ entries, onOpenChange, onSave, open }: OpeningHoursDialogProps) {
  const [draft, setDraft] = useState<ClinicOpeningHours[]>(entries.map((entry) => ({ ...entry })))

  return (
    <Modal
      description="Update the hours shown on the public clinic profile."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft)
              onOpenChange(false)
            }}
          >
            Apply hours
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Edit opening hours"
    >
      <div className="grid gap-4">
        {draft.map((entry, index) => (
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-center" key={entry.days}>
            <strong>{entry.days}</strong>
            <label className="grid gap-1 text-sm font-bold">
              <span className="sr-only">Hours for {entry.days}</span>
              <Input
                aria-label={`Hours for ${entry.days}`}
                onValueChange={(value) =>
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, hours: value } : item,
                    ),
                  )
                }
                value={entry.hours}
              />
            </label>
          </div>
        ))}
      </div>
    </Modal>
  )
}
