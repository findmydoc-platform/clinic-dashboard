"use client"

import { useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  getTeamMemberInitials,
  type ClinicTeamMember,
  type ClinicTeamMemberInput,
} from "../../model/clinic-profile"

type TeamMemberDialogProps = Readonly<{
  initialMember?: ClinicTeamMember
  isReadOnly: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ClinicTeamMemberInput) => void
  open: boolean
}>

export function TeamMemberDialog({
  initialMember,
  isReadOnly,
  onOpenChange,
  onSave,
  open,
}: TeamMemberDialogProps) {
  const nameParts = initialMember?.name.split(" ") ?? []
  const [firstName, setFirstName] = useState(nameParts.slice(0, -1).join(" "))
  const [lastName, setLastName] = useState(nameParts.at(-1) ?? "")
  const [specialty, setSpecialty] = useState(initialMember?.specialty ?? "")
  const [biography, setBiography] = useState(initialMember?.biography ?? "")
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
  const canSave = Boolean(fullName && specialty && biography.trim())

  const save = () => {
    if (!canSave) return
    onSave({
      avatar: initialMember?.avatar,
      biography: biography.trim(),
      initials: getTeamMemberInitials(fullName),
      name: fullName,
      specialty,
    })
    onOpenChange(false)
  }

  return (
    <Modal
      description={
        isReadOnly
          ? "View this team member on the public clinic profile."
          : "Add or update a team member on the public clinic profile."
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {isReadOnly ? "Done" : "Cancel"}
          </Button>
          {!isReadOnly ? (
            <Button disabled={!canSave} onClick={save}>
              {initialMember ? "Save team member" : "Add team member"}
            </Button>
          ) : null}
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={isReadOnly ? "Team member details" : initialMember ? "Edit team member" : "Add team member"}
    >
      <fieldset className="grid gap-5" disabled={isReadOnly}>
        <div className="flex flex-wrap items-center gap-4">
          <button
            aria-label="Choose profile image"
            className="inline-flex size-24 items-center justify-center rounded-full border-2 border-dashed border-[var(--primary)] bg-[var(--surface)]"
            type="button"
          >
            <Camera aria-hidden="true" className="size-7" />
          </button>
          <div>
            <strong>Upload profile image</strong>
            <p className="mt-1 max-w-sm text-sm text-[var(--foreground)]">
              PNG or JPG up to 5 MB. Recommended format: square.
            </p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field isRequired label="First name">
            {(controlProps) => (
              <Input
                {...controlProps}
                onValueChange={setFirstName}
                placeholder="e.g. Anna"
                value={firstName}
              />
            )}
          </Field>
          <Field isRequired label="Last name">
            {(controlProps) => (
              <Input
                {...controlProps}
                onValueChange={setLastName}
                placeholder="e.g. Schmidt"
                value={lastName}
              />
            )}
          </Field>
        </div>
        <Field isRequired label="Specialty / role">
          {(controlProps) => (
            <Select {...controlProps} onValueChange={setSpecialty} value={specialty}>
              <option value="">Select role…</option>
              <option value="Dermatologist and laser specialist">Dermatologist and laser specialist</option>
              <option value="Medical assistant">Medical assistant</option>
              <option value="Clinic management">Clinic management</option>
              <option value="Orthodontics specialist">Orthodontics specialist</option>
              <option value="Patient coordinator">Patient coordinator</option>
            </Select>
          )}
        </Field>
        <Field isRequired label="Short biography">
          {(controlProps) => (
            <Textarea
              {...controlProps}
              onValueChange={setBiography}
              placeholder="Describe the team member's experience and expertise…"
              value={biography}
            />
          )}
        </Field>
      </fieldset>
    </Modal>
  )
}
