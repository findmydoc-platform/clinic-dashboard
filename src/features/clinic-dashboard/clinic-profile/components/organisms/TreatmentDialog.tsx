"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import type { ClinicTreatmentInput, ClinicTreatmentView, MasterTreatment } from "../../model/clinic-profile"

type TreatmentDialogProps = Readonly<{
  availableTreatments: readonly MasterTreatment[]
  initialTreatment?: ClinicTreatmentView
  isReadOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ClinicTreatmentInput) => boolean
  onTreatmentMissing?: () => void
  open: boolean
}>

export function TreatmentDialog({
  availableTreatments,
  initialTreatment,
  isReadOnly,
  onOpenChange,
  onSave,
  onTreatmentMissing,
  open,
}: TreatmentDialogProps) {
  const [masterTreatmentId, setMasterTreatmentId] = useState(initialTreatment?.masterTreatmentId ?? "")
  const [price, setPrice] = useState(initialTreatment?.price ?? "")
  const isCreating = !initialTreatment
  const canSave = Boolean(masterTreatmentId && price.trim())

  const save = () => {
    if (!canSave) return
    const accepted = onSave({ masterTreatmentId, price: price.trim() })
    if (accepted) onOpenChange(false)
  }

  const openSupport = () => {
    onOpenChange(false)
    onTreatmentMissing?.()
  }

  return (
    <Modal
      description={
        isReadOnly
          ? "View the platform treatment and this clinic's public price."
          : initialTreatment
            ? "Update this clinic's public price for the platform treatment."
            : "Choose a platform treatment and set this clinic's public price."
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {isCreating && onTreatmentMissing ? (
            <Button
              className="justify-start px-0 text-[var(--primary)] enabled:hover:bg-transparent enabled:hover:text-[var(--primary-hover)]"
              onClick={openSupport}
              variant="ghost"
            >
              Treatment missing?
            </Button>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              {isReadOnly ? "Done" : "Cancel"}
            </Button>
            {!isReadOnly ? (
              <Button disabled={!canSave} onClick={save}>
                {initialTreatment ? "Save price" : "Add treatment"}
              </Button>
            ) : null}
          </div>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={isReadOnly ? "Treatment details" : initialTreatment ? "Edit clinic price" : "Add treatment"}
    >
      <div className="grid gap-5">
        {isCreating ? (
          <Field
            description="Treatment names are maintained in the findmydoc platform catalogue."
            isRequired
            label="Treatment"
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                disabled={isReadOnly}
                onValueChange={setMasterTreatmentId}
                value={masterTreatmentId}
              >
                <option value="">Select a treatment…</option>
                {availableTreatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>
                    {treatment.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        ) : (
          <Field label="Treatment">
            {(controlProps) => <Input {...controlProps} readOnly value={initialTreatment.name} />}
          </Field>
        )}

        <Field
          description={
            isReadOnly
              ? "This is the clinic-specific public price."
              : "Only the clinic-specific public price can be changed here."
          }
          isRequired={!isReadOnly}
          label="Price"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              onValueChange={isReadOnly ? undefined : setPrice}
              placeholder="e.g. €250"
              readOnly={isReadOnly}
              value={price}
            />
          )}
        </Field>
      </div>
    </Modal>
  )
}
