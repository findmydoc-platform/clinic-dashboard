"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import type { ClinicProfileValidationErrors } from "../../model/clinic-profile-editing"
import type { ClinicProfileCity, ClinicProfileDraftInput } from "../../model/clinic-profile-source"

type AddressDialogProps = Readonly<{
  address: ClinicProfileDraftInput["address"]
  cities: readonly ClinicProfileCity[]
  errors: ClinicProfileValidationErrors
  onOpenChange: (open: boolean) => void
  onSave: (address: ClinicProfileDraftInput["address"]) => void
  open: boolean
}>

export function AddressDialog({ address, cities, errors, onOpenChange, onSave, open }: AddressDialogProps) {
  const [draft, setDraft] = useState(address)

  return (
    <Modal
      description="Update the public address. Country is fixed to Türkiye."
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
        <Field error={errors["address.street"]} label="Street">
          {(controlProps) => (
            <Input
              {...controlProps}
              onValueChange={(street) => setDraft((current) => ({ ...current, street }))}
              value={draft.street}
            />
          )}
        </Field>
        <Field error={errors["address.houseNumber"]} label="House number">
          {(controlProps) => (
            <Input
              {...controlProps}
              onValueChange={(houseNumber) => setDraft((current) => ({ ...current, houseNumber }))}
              value={draft.houseNumber}
            />
          )}
        </Field>
        <Field error={errors["address.cityId"]} label="City">
          {(controlProps) => (
            <Combobox
              {...controlProps}
              emptyText="No matching Turkish city."
              onValueChange={(cityId) => setDraft((current) => ({ ...current, cityId }))}
              options={cities.map((city) => ({ label: city.name, value: city.id }))}
              placeholder="Search cities"
              value={draft.cityId}
            />
          )}
        </Field>
        <Field error={errors["address.zipCode"]} label="Postal code">
          {(controlProps) => (
            <Input
              {...controlProps}
              onValueChange={(zipCode) => setDraft((current) => ({ ...current, zipCode }))}
              value={draft.zipCode}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <div className="text-sm font-bold text-[var(--secondary)]">Country</div>
          <p className="mt-2 text-sm">Türkiye</p>
        </div>
      </div>
    </Modal>
  )
}
