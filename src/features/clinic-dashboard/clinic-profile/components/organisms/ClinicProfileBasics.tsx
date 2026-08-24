import { Card } from "@/components/ui/card"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TagInput } from "@/components/ui/tag-input"
import { Textarea } from "@/components/ui/textarea"
import {
  clinicProfileLanguageLabels,
  type ClinicProfileValidationErrors,
} from "../../model/clinic-profile-editing"
import {
  clinicProfileSupportedLanguageValues,
  type ClinicProfileSupportedLanguage,
} from "../../model/clinic-profile-source"

const languageOptions = clinicProfileSupportedLanguageValues.map((value) => ({
  label: clinicProfileLanguageLabels[value],
  value,
}))

type ClinicProfileBasicsProps = Readonly<{
  description: string
  errors: ClinicProfileValidationErrors
  isEditing: boolean
  name: string
  onDescriptionChange: (description: string) => void
  onLanguagesChange: (languages: readonly ClinicProfileSupportedLanguage[]) => void
  onNameChange: (name: string) => void
  supportedLanguages: readonly ClinicProfileSupportedLanguage[]
}>

export function ClinicProfileBasics({
  description,
  errors,
  isEditing,
  name,
  onDescriptionChange,
  onLanguagesChange,
  onNameChange,
  supportedLanguages,
}: ClinicProfileBasicsProps) {
  return (
    <Card aria-label="Profile basics" className="p-5 sm:p-6">
      {isEditing ? (
        <div className="grid gap-5">
          <Field
            error={errors.name}
            label={<span className="text-xs tracking-wide uppercase">Clinic name</span>}
          >
            {(controlProps) => (
              <Input {...controlProps} className="font-bold" onValueChange={onNameChange} value={name} />
            )}
          </Field>
          <Field
            error={errors.descriptionText}
            label={<span className="text-xs tracking-wide uppercase">Description</span>}
          >
            {(controlProps) => (
              <Textarea
                {...controlProps}
                className="min-h-32 text-sm leading-6"
                onValueChange={onDescriptionChange}
                value={description}
              />
            )}
          </Field>
          <Field
            error={errors.supportedLanguages}
            label={<span className="text-xs tracking-wide uppercase">Languages</span>}
          >
            {(controlProps) => (
              <TagInput
                {...controlProps}
                allowCustomValues={false}
                onValueChange={(values) =>
                  onLanguagesChange(values as readonly ClinicProfileSupportedLanguage[])
                }
                options={languageOptions}
                placeholder="Select languages"
                value={supportedLanguages}
              />
            )}
          </Field>
        </div>
      ) : (
        <dl className="grid gap-6">
          <div>
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Clinic name
            </dt>
            <dd className="mt-2 text-xl font-bold text-[var(--secondary)]">{name || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
              Description
            </dt>
            <dd className="mt-2 text-sm leading-6 whitespace-pre-wrap">{description || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">Languages</dt>
            <dd className="mt-2 text-sm">
              {supportedLanguages.length > 0
                ? supportedLanguages.map((language) => clinicProfileLanguageLabels[language]).join(", ")
                : "Not provided"}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  )
}
