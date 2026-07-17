"use client"

import { useRef, useState } from "react"
import { Field } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import type { ClinicReview } from "../../model/review"
import type { ReviewMutationResult } from "../../model/reviews-view-model"
import { ReviewMutationDialog } from "./ReviewMutationDialog"

type ReviewTextMutationDialogProps = Readonly<{
  description: string
  initialValue?: string
  label: string
  onClose: () => void
  onSubmit: (value: string) => Promise<ReviewMutationResult>
  placeholder: string
  review: ClinicReview
  submitLabel: string
  title: string
}>

export function ReviewTextMutationDialog({
  description,
  initialValue = "",
  label,
  onClose,
  onSubmit,
  placeholder,
  review,
  submitLabel,
  title,
}: ReviewTextMutationDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [valueError, setValueError] = useState("")
  const valueRef = useRef<HTMLTextAreaElement>(null)
  const trimmedValue = value.trim()

  const submit = async () => {
    if (trimmedValue.length < 10) {
      setValueError("Enter at least 10 characters.")
      valueRef.current?.focus()
      return "discarded" as const
    }

    setValueError("")
    return onSubmit(trimmedValue)
  }

  return (
    <ReviewMutationDialog
      description={description}
      isSubmitDisabled={trimmedValue.length < 10}
      onClose={onClose}
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
