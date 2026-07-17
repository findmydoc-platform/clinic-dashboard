"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import type { ClinicProfileDraft } from "../../model/clinic-profile"

type AddressDialogProps = Readonly<{
  address: ClinicProfileDraft["address"]
  onOpenChange: (open: boolean) => void
  onSave: (address: ClinicProfileDraft["address"]) => void
  open: boolean
}>

export function AddressDialog({ address, onOpenChange, onSave, open }: AddressDialogProps) {
  const [draft, setDraft] = useState(address)

  return (
    <Modal
      description="Update the contact details shown on the public clinic profile."
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
            Apply address
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Edit address"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {(
          [
            ["Street", "street"],
            ["City", "city"],
            ["Postal code", "postalCode"],
            ["Phone", "phone"],
          ] as const
        ).map(([label, key]) => (
          <Field className={key === "street" ? "sm:col-span-2" : undefined} key={key} label={label}>
            {(controlProps) => (
              <Input
                {...controlProps}
                onValueChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                value={draft[key]}
              />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  )
}
