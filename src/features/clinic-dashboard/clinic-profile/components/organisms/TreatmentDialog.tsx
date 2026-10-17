"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import type { EditorDepartureRequest } from "@/lib/editor-departure"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import type {
  ClinicTreatmentFormInput,
  ClinicTreatmentOffering,
  MasterTreatment,
} from "../../model/clinic-treatment"
import { isValidClinicTreatmentPrice } from "../../model/clinic-treatments"

type TreatmentDialogProps = Readonly<{
  contextNavigation?: ReactNode
  availableTreatments: readonly MasterTreatment[]
  initialTreatment?: ClinicTreatmentOffering
  isBusy: boolean
  isReadOnly: boolean
  message?: string
  navigationNotice?: string
  onNavigationRequestChange?: (request: EditorDepartureRequest | null) => void
  onOpenChange: (open: boolean) => void
  onSave: (input: ClinicTreatmentFormInput) => Promise<boolean>
  onTreatmentMissing?: () => void
  open: boolean
}>

export function TreatmentDialog({
  availableTreatments,
  contextNavigation,
  initialTreatment,
  isBusy,
  isReadOnly,
  message,
  navigationNotice,
  onNavigationRequestChange,
  onOpenChange,
  onSave,
  onTreatmentMissing,
  open,
}: TreatmentDialogProps) {
  const pendingNavigation = useRef<{ continuation: () => void; onCancel?: () => void } | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [busyNotice, setBusyNotice] = useState("")
  const [treatmentId, setTreatmentId] = useState(initialTreatment?.treatment.id ?? "")
  const [price, setPrice] = useState(initialTreatment ? String(initialTreatment.price) : "")
  const [priceTouched, setPriceTouched] = useState(false)
  const [active, setActive] = useState(initialTreatment?.active ?? false)
  const isCreating = !initialTreatment
  const parsedPrice = Number(price)
  const selectedMasterTreatment =
    initialTreatment?.treatment ?? availableTreatments.find((treatment) => treatment.id === treatmentId)
  const hasChanged =
    isCreating || price !== String(initialTreatment.price) || active !== initialTreatment.active
  const priceError =
    priceTouched && (!price.trim() || !isValidClinicTreatmentPrice(parsedPrice))
      ? "Enter a non-negative EUR price with at most two decimal places."
      : undefined
  const canSave = Boolean(
    treatmentId && price.trim() && isValidClinicTreatmentPrice(parsedPrice) && hasChanged && !isBusy,
  )

  const save = async () => {
    if (!canSave) return
    if (await onSave({ active, price: parsedPrice, treatmentId })) onOpenChange(false)
  }

  const openSupport = () =>
    requestNavigation(() => {
      onOpenChange(false)
      onTreatmentMissing?.()
    })

  const dirty = !isReadOnly && hasChanged && Boolean(treatmentId || price || active)
  const requestNavigation = useCallback<EditorDepartureRequest>(
    (continuation, onCancel, intent) => {
      if (intent === "access-loss") {
        if (dirty || isBusy)
          return { draft: { treatmentId, price, active }, discard: () => onOpenChange(false) }
        return
      }
      if (isBusy) {
        setBusyNotice("Wait for the current treatment save before continuing.")
        onCancel?.()
        return
      }
      if (dirty) {
        pendingNavigation.current?.onCancel?.()
        pendingNavigation.current = { continuation, onCancel }
        setLeaving(true)
      } else {
        onOpenChange(false)
        continuation()
      }
    },
    [active, dirty, isBusy, onOpenChange, price, treatmentId],
  )
  useEffect(() => {
    if (!open) return
    onNavigationRequestChange?.(requestNavigation)
    return () => onNavigationRequestChange?.(null)
  }, [open, onNavigationRequestChange, requestNavigation])
  useEffect(() => {
    if (!open || !dirty) return
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", protect)
    return () => window.removeEventListener("beforeunload", protect)
  }, [open, dirty])
  const cancelDeparture = () => {
    const pending = pendingNavigation.current
    pendingNavigation.current = null
    setLeaving(false)
    pending?.onCancel?.()
  }
  const continueDeparture = () => {
    const pending = pendingNavigation.current
    pendingNavigation.current = null
    setLeaving(false)
    onOpenChange(false)
    pending?.continuation()
  }
  const saveAndLeave = async () => {
    if (!canSave) return
    if (await onSave({ active, price: parsedPrice, treatmentId })) continueDeparture()
  }
  const requestClose = () => requestNavigation(() => onOpenChange(false))

  return (
    <>
      <Modal
        headerMeta={contextNavigation}
        description={
          isReadOnly
            ? "View the central treatment details and this clinic's EUR price."
            : initialTreatment
              ? "Update this clinic's EUR price and public status."
              : "Choose a central treatment and set this clinic's EUR price. New treatments start inactive."
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
              <Button disabled={isBusy} onClick={requestClose} variant="outline">
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
        onOpenChange={(next) => {
          if (!next) requestClose()
        }}
        open={open}
        title={isReadOnly ? "Treatment details" : initialTreatment ? "Edit treatment" : "Add treatment"}
      >
        <div className="grid gap-5">
          {busyNotice ? (
            <p role="alert" className="text-sm font-bold text-[var(--destructive)]">
              {busyNotice}
            </p>
          ) : null}
          {navigationNotice ? (
            <p className="mb-3 text-sm font-bold text-[var(--destructive)]" role="alert">
              {navigationNotice}
            </p>
          ) : null}
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

          {isCreating ? (
            <p className="text-sm leading-6 text-[var(--secondary)]">
              New treatments are added inactive. Activate the treatment after it has been saved.
            </p>
          ) : (
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
          )}
        </div>
      </Modal>
      <Modal
        open={leaving}
        role="alertdialog"
        title="Leave treatment editing?"
        description="Your treatment changes have not been saved."
        onOpenChange={(next) => {
          if (!next && !isBusy) cancelDeparture()
        }}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button disabled={isBusy} onClick={cancelDeparture} variant="outline">
              Keep editing
            </Button>
            <Button disabled={isBusy} onClick={continueDeparture} variant="destructive">
              Discard and continue
            </Button>
            <Button disabled={!canSave} onClick={() => void saveAndLeave()}>
              {isBusy ? "Saving…" : "Save and continue"}
            </Button>
          </div>
        }
      >
        {message ? (
          <p role="alert" className="text-sm font-bold text-[var(--destructive)]">
            {message}
          </p>
        ) : (
          <p>Keep editing, save for the original clinic, or discard these changes.</p>
        )}
      </Modal>
    </>
  )
}
