"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ClinicTreatment, ClinicTreatmentInput } from "../../model/clinic-profile"

type TreatmentDialogProps = Readonly<{
  initialTreatment?: ClinicTreatment
  isReadOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ClinicTreatmentInput) => void
  open: boolean
}>

export function TreatmentDialog({
  initialTreatment,
  isReadOnly,
  onOpenChange,
  onSave,
  open,
}: TreatmentDialogProps) {
  const [name, setName] = useState(initialTreatment?.name ?? "")
  const [category, setCategory] = useState(initialTreatment?.category ?? "")
  const [duration, setDuration] = useState(initialTreatment?.duration.replace(/\D/g, "") ?? "")
  const [price, setPrice] = useState(initialTreatment?.price.replace(/[^\d.,]/g, "") ?? "")
  const [description, setDescription] = useState(initialTreatment?.description ?? "")
  const canSave = Boolean(name.trim() && category && duration.trim() && price.trim() && description.trim())

  const save = () => {
    if (!canSave) return
    onSave({
      category,
      description: description.trim(),
      duration: `${duration.trim()} min`,
      name: name.trim(),
      price: `€${price.trim().replace(",", ".")}`,
    })
    onOpenChange(false)
  }

  return (
    <Modal
      description={
        initialTreatment
          ? "Update this treatment on the public clinic profile."
          : "Add a treatment to the public clinic profile."
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          {!isReadOnly ? (
            <Button disabled={!canSave} onClick={save}>
              {initialTreatment ? "Save treatment changes" : "Save treatment"}
            </Button>
          ) : null}
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={initialTreatment ? "Edit treatment" : "Create new treatment"}
    >
      <fieldset className="grid gap-5" disabled={isReadOnly}>
        <Field isRequired label="Treatment name">
          {(controlProps) => (
            <Input
              {...controlProps}
              onValueChange={setName}
              placeholder="e.g. Express whitening"
              value={name}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field isRequired label="Category">
            {(controlProps) => (
              <Select {...controlProps} onValueChange={setCategory} value={category}>
                <option value="">Select…</option>
                <option value="Dentistry">Dentistry</option>
                <option value="Aesthetics">Aesthetics</option>
                <option value="Orthopaedics">Orthopaedics</option>
              </Select>
            )}
          </Field>
          <Field isRequired label="Duration (minutes)">
            {(controlProps) => (
              <Input
                {...controlProps}
                inputMode="numeric"
                onValueChange={setDuration}
                placeholder="30"
                value={duration}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field isRequired label="Price (€)">
            {(controlProps) => (
              <Input
                {...controlProps}
                inputMode="decimal"
                onValueChange={setPrice}
                placeholder="0.00"
                value={price}
              />
            )}
          </Field>
          <div className="flex items-center rounded-lg bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]">
            <Info aria-hidden="true" className="mr-2 size-4 shrink-0" /> Enter the patient price including
            VAT.
          </div>
        </div>
        <Field isRequired label="Description">
          {(controlProps) => (
            <Textarea
              {...controlProps}
              onValueChange={setDescription}
              placeholder="Describe the treatment process…"
              value={description}
            />
          )}
        </Field>
      </fieldset>
    </Modal>
  )
}
