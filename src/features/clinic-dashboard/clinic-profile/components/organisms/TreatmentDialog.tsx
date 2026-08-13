"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import type {
  ClinicTreatmentCreateInput,
  ClinicTreatmentOffering,
  MasterTreatment,
} from "../../model/clinic-treatment"
import { isValidClinicTreatmentPrice } from "../../model/clinic-treatments"

type TreatmentDialogProps = Readonly<{
  availableTreatments: readonly MasterTreatment[]
  initialTreatment?: ClinicTreatmentOffering
  isBusy: boolean
  isReadOnly: boolean
  message?: string
  onOpenChange: (open: boolean) => void
  onSave: (input: ClinicTreatmentCreateInput) => Promise<boolean>
  onTreatmentMissing?: () => void
  open: boolean
}>

export function TreatmentDialog({
  availableTreatments,
  initialTreatment,
  isBusy,
  isReadOnly,
  message,
  onOpenChange,
  onSave,
  onTreatmentMissing,
  open,
}: TreatmentDialogProps) {
  const [treatmentId, setTreatmentId] = useState(initialTreatment?.treatment.id ?? "")
  const [price, setPrice] = useState(initialTreatment ? String(initialTreatment.price) : "")
  const [priceTouched, setPriceTouched] = useState(false)
  const [active, setActive] = useState(initialTreatment?.active ?? false)
  const isCreating = !initialTreatment
  const parsedPrice = Number(price)
  const selectedMasterTreatment =
    initialTreatment?.treatment ?? availableTreatments.find((treatment) => treatment.id === treatmentId)
  const hasChanged =
    isCreating || parsedPrice !== initialTreatment.price || active !== initialTreatment.active
  const priceError =
    priceTouched && (!price.trim() || !isValidClinicTreatmentPrice(parsedPrice))
      ? "Enter a non-negative EUR price with at most two decimal places."
      : undefined
  const canSave = Boolean(
    treatmentId && price.trim() && isValidClinicTreatmentPrice(parsedPrice) && hasChanged && !isBusy,
  )

  const save = async () => {
    if (!canSave) return
    await onSave({ active, price: parsedPrice, treatmentId })
  }

  const openSupport = () => {
    onOpenChange(false)
    onTreatmentMissing?.()
  }

  return (
    <Modal
      description={
        isReadOnly
          ? "View the central treatment details and this clinic's EUR price."
          : initialTreatment
            ? "Update this clinic's EUR price and public status."
            : "Choose a central treatment and set this clinic's EUR price and public status."
      }
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <Button disabled={isBusy} onClick={() => onOpenChange(false)} variant="outline">
              {isReadOnly ? "Done" : "Cancel"}
            </Button>
            {!isReadOnly ? (
              <Button disabled={!canSave} onClick={save}>
                {isBusy ? "Saving…" : initialTreatment ? "Save changes" : "Add treatment"}
              </Button>
            ) : null}
          </div>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={isReadOnly ? "Treatment details" : initialTreatment ? "Edit treatment" : "Add treatment"}
    >
      <div className="grid gap-5">
        {message ? (
          <p className="text-sm font-bold text-[var(--destructive)]" role="alert">
            {message}
          </p>
        ) : null}
        {isCreating ? (
          <Field
            description="Treatment names and descriptions are maintained centrally by findmydoc."
            isRequired
            label="Treatment"
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                disabled={isReadOnly || isBusy}
                onValueChange={setTreatmentId}
                value={treatmentId}
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
            {(controlProps) => <Input {...controlProps} readOnly value={initialTreatment.treatment.name} />}
          </Field>
        )}

        {selectedMasterTreatment ? (
          <div className="grid gap-2">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Central description</h3>
            <p className="text-sm leading-6 whitespace-pre-line text-[var(--foreground)]">
              {selectedMasterTreatment.descriptionText || "No description available."}
            </p>
          </div>
        ) : null}

        <Field
          description="Fixed currency: EUR. Enter zero or a positive amount with up to two decimal places."
          error={priceError}
          isInvalid={Boolean(priceError)}
          isRequired={!isReadOnly}
          label="Price (EUR)"
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              disabled={isBusy}
              inputMode="decimal"
              min="0"
              onValueChange={
                isReadOnly
                  ? undefined
                  : (value) => {
                      setPriceTouched(true)
                      setPrice(value)
                    }
              }
              placeholder="250.00"
              readOnly={isReadOnly}
              step="0.01"
              type="number"
              value={price}
            />
          )}
        </Field>

        <label className="flex min-h-11 items-center gap-3 text-sm font-bold text-[var(--foreground)]">
          <input
            checked={active}
            className="size-5 accent-[var(--primary)]"
            disabled={isReadOnly || isBusy}
            onChange={(event) => setActive(event.currentTarget.checked)}
            type="checkbox"
          />
          Publicly active
        </label>
      </div>
    </Modal>
  )
}
