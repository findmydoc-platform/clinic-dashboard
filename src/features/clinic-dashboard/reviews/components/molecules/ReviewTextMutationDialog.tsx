"use client"

import { useRef, useState } from "react"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import type { ClinicReviewRecord } from "../../model/review-source"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewMutationDialog } from "./ReviewMutationDialog"

type ReviewTextMutationDialogProps = Readonly<{
  description: string
  initialValue?: string
  label: string
  onNavigationRequestChange?: (
    request: ((continuation: () => void, onCancel?: () => void) => void) | null,
  ) => void
  onClose: () => void
  onSubmit: (value: string) => Promise<ReviewMutationResult>
  placeholder: string
  review: ClinicReviewRecord
  submitLabel: string
  title: string
}>

export function ReviewTextMutationDialog({
  description,
  initialValue = "",
  label,
  onClose,
  onNavigationRequestChange,
  onSubmit,
  placeholder,
  review,
  submitLabel,
  title,
}: ReviewTextMutationDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [valueError, setValueError] = useState("")
  const valueRef = useRef<HTMLTextAreaElement>(null)
  const initialTrimmedValue = initialValue.trim()
  const trimmedValue = value.trim()
  const isUnchanged = trimmedValue === initialTrimmedValue

  const submit = async () => {
    if (trimmedValue.length < 10) {
      setValueError("Enter at least 10 characters.")
      valueRef.current?.focus()
      return "discarded" as const
    }

    if (isUnchanged) return "discarded" as const

    setValueError("")
    return onSubmit(trimmedValue)
  }

  return (
    <ReviewMutationDialog
      description={description}
      draft={{ body: value }}
      isDirty={value !== initialValue}
      isSubmitDisabled={trimmedValue.length < 10 || isUnchanged}
      onClose={onClose}
      onNavigationRequestChange={onNavigationRequestChange}
      onSubmit={submit}
      review={review}
      submitLabel={submitLabel}
      title={title}
    >
      <Field
        description={`Minimum 10 characters · ${trimmedValue.length} entered`}
        error={valueError || undefined}
        isRequired
        label={label}
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            className="min-h-36"
            maxLength={2000}
            onValueChange={(nextValue) => {
              setValue(nextValue)
              setValueError("")
            }}
            placeholder={placeholder}
            ref={valueRef}
            value={value}
          />
        )}
      </Field>
    </ReviewMutationDialog>
  )
}
