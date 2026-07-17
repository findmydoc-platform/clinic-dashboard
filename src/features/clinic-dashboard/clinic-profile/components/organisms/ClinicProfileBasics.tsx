import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ClinicProfileBasicsProps = Readonly<{
  description: string
  isEditingDisabled: boolean
  name: string
  onDescriptionChange: (description: string) => void
  onNameChange: (name: string) => void
  onSpecialtyAdd: () => void
  onSpecialtyRemove: (specialty: string) => void
  showSpecialtyActions: boolean
  specialties: readonly string[]
}>

export function ClinicProfileBasics({
  description,
  isEditingDisabled,
  name,
  onDescriptionChange,
  onNameChange,
  onSpecialtyAdd,
  onSpecialtyRemove,
  showSpecialtyActions,
  specialties,
}: ClinicProfileBasicsProps) {
  return (
    <Card aria-label="Profile basics" className="p-5 sm:p-6">
      <div className="grid gap-5">
        <Field label={<span className="text-xs tracking-wide uppercase">Clinic name</span>}>
          {(controlProps) => (
            <Input
              {...controlProps}
              className="font-bold"
              disabled={isEditingDisabled}
              onValueChange={onNameChange}
              value={name}
            />
          )}
        </Field>
        <Field label={<span className="text-xs tracking-wide uppercase">Description</span>}>
          {(controlProps) => (
            <Textarea
              {...controlProps}
              className="min-h-32 text-sm leading-6"
              disabled={isEditingDisabled}
              onValueChange={onDescriptionChange}
              value={description}
            />
          )}
        </Field>
        <div>
          <div className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
            Specialties
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {specialties.map((specialty) => (
              <span
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-[var(--on-primary)]"
                key={specialty}
              >
                {specialty}
                {showSpecialtyActions ? (
                  <button
                    aria-label={`Remove ${specialty} specialty`}
                    className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-primary)]"
                    disabled={isEditingDisabled}
                    onClick={() => onSpecialtyRemove(specialty)}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                ) : null}
              </span>
            ))}
            {showSpecialtyActions ? (
              <Button disabled={isEditingDisabled} onClick={onSpecialtyAdd} size="small" variant="outline">
                <Plus aria-hidden="true" className="size-4" /> Add
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  )
}
