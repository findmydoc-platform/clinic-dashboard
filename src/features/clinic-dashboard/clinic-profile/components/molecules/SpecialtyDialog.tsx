"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"

type SpecialtyDialogProps = Readonly<{
  existing: readonly string[]
  onAdd: (specialty: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}>

const specialtyOptions = ["Aesthetic medicine", "Dentistry", "Dermatology", "Hair transplantation"]

export function SpecialtyDialog({ existing, onAdd, onOpenChange, open }: SpecialtyDialogProps) {
  const [value, setValue] = useState("")

  return (
    <Modal
      description="Add a specialty to the public clinic profile."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!value}
            onClick={() => {
              onAdd(value)
              onOpenChange(false)
            }}
          >
            Add specialty
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Add specialty"
    >
      <Field label="Specialty">
        {(controlProps) => (
          <Select {...controlProps} onValueChange={setValue} value={value}>
            <option value="">Select a specialty…</option>
            {specialtyOptions.map((option) => (
              <option disabled={existing.includes(option)} key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </Modal>
  )
}
