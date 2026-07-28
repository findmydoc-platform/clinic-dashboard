"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, CirclePlus, X } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { TagInput, type TagInputOption } from "@/components/ui/tag-input"
import { Textarea } from "@/components/ui/textarea"
import {
  doctorLanguageValues,
  doctorProfileFieldLimits,
  doctorSpecializationLevelValues,
  doctorTitleValues,
  type DoctorLanguage,
  type DoctorProfile,
  type MedicalSpecialtyOption,
} from "../../model/doctor-profile"
import {
  createDoctorProfileDraft,
  getDoctorProfileDraftErrors,
  type DoctorProfileDraft,
  type DoctorProfileSaveFailure,
  type DoctorProfileSaveResult,
} from "../../model/doctor-profile-editor"

const languageLabels: Record<DoctorLanguage, string> = {
  arabic: "Arabic",
  chinese: "Chinese",
  english: "English",
  french: "French",
  german: "German",
  italian: "Italian",
  japanese: "Japanese",
  korean: "Korean",
  portuguese: "Portuguese",
  russian: "Russian",
  spanish: "Spanish",
  turkish: "Turkish",
}

const languageOptions = doctorLanguageValues.map((language) => ({
  label: languageLabels[language],
  value: language,
})) satisfies readonly TagInputOption[]

const titleLabels: Record<(typeof doctorTitleValues)[number], string> = {
  assoc_prof: "Associate professor",
  dr: "Dr.",
  prof_dr: "Prof. Dr.",
  specialist: "Specialist",
  surgeon: "Surgeon",
}

const levelLabels: Record<(typeof doctorSpecializationLevelValues)[number], string> = {
  advanced: "Advanced",
  beginner: "Beginner",
  expert: "Expert",
  intermediate: "Intermediate",
  specialist: "Specialist",
}

type DoctorProfileDialogProps = Readonly<{
  initialDoctor?: DoctorProfile
  medicalSpecialties: readonly MedicalSpecialtyOption[]
  onOpenChange: (open: boolean) => void
  onSave: (draft: DoctorProfileDraft, persistedDoctor?: DoctorProfile) => Promise<DoctorProfileSaveResult>
  open: boolean
}>

function draftFingerprint(draft: DoctorProfileDraft) {
  return JSON.stringify({
    ...draft,
    imageFile: draft.imageFile
      ? {
          lastModified: draft.imageFile.lastModified,
          name: draft.imageFile.name,
          size: draft.imageFile.size,
          type: draft.imageFile.type,
        }
      : undefined,
    specialties: draft.specialties.map(({ assignmentId, medicalSpecialtyId, specializationLevel }) => ({
      assignmentId,
      medicalSpecialtyId,
      specializationLevel,
    })),
  })
}

function doctorInitials(doctor: DoctorProfile | undefined, draft: DoctorProfileDraft) {
  const names = doctor ? [doctor.firstName, doctor.lastName] : [draft.firstName.trim(), draft.lastName.trim()]
  return names
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("")
}

function qualificationValues(qualifications: string) {
  return qualifications
    .split("\n")
    .map((qualification) => qualification.trim())
    .filter(Boolean)
}

function specialtyValidationTarget(draft: DoctorProfileDraft) {
  const missingSpecialty = draft.specialties.find(({ medicalSpecialtyId }) => !medicalSpecialtyId)
  if (missingSpecialty) return { clientId: missingSpecialty.clientId, control: "specialty" } as const

  const missingLevel = draft.specialties.find(({ specializationLevel }) => !specializationLevel)
  if (missingLevel) return { clientId: missingLevel.clientId, control: "level" } as const

  const seenSpecialtyIds = new Set<string>()
  for (const specialty of draft.specialties) {
    if (seenSpecialtyIds.has(specialty.medicalSpecialtyId)) {
      return { clientId: specialty.clientId, control: "specialty" } as const
    }
    seenSpecialtyIds.add(specialty.medicalSpecialtyId)
  }
  return undefined
}

function hasSaveFailure(
  failures: readonly DoctorProfileSaveFailure[],
  kind: DoctorProfileSaveFailure["kind"],
) {
  return failures.some((failure) => failure.kind === kind)
}

function formatFailureList(labels: readonly string[]) {
  if (labels.length <= 1) return labels[0] ?? "The doctor profile"
  if (labels.length === 2) return labels.join(" and ")
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`
}

function saveFailureMessage(
  result: DoctorProfileSaveResult,
  medicalSpecialties: readonly MedicalSpecialtyOption[],
) {
  if (hasSaveFailure(result.failedSteps, "profile-uncertain")) {
    return "The create request may have completed. Close this dialog and reload Doctors before trying again."
  }

  const failureLabels = result.failedSteps.flatMap((failure) => {
    if (failure.kind === "profile") return ["Profile details"]
    if (failure.kind === "image") return ["Profile photo"]
    if (failure.kind === "activation") return ["Profile activation"]
    if (failure.kind !== "specialty") return []

    const specialtyId = result.draft.specialties.find(
      ({ clientId }) => clientId === failure.clientId,
    )?.medicalSpecialtyId
    const specialtyName = medicalSpecialties.find(({ id }) => id === specialtyId)?.name
    return [specialtyName ? `Medical specialty “${specialtyName}”` : "Medical specialty"]
  })
  const uniqueFailureLabels = [...new Set(failureLabels)]
  const cleanupPending = hasSaveFailure(result.failedSteps, "image-cleanup")

  if (uniqueFailureLabels.length > 0) {
    const retryMessage =
      result.status === "partial"
        ? "Other changes were saved; save again to retry only these changes."
        : "Check your connection and try again."
    const cleanupMessage = cleanupPending
      ? " The new profile photo is active, but the previous photo could not be removed."
      : ""
    return `${formatFailureList(uniqueFailureLabels)} could not be saved. ${retryMessage}${cleanupMessage}`
  }

  if (cleanupPending) {
    return "The new profile photo was saved, but the previous photo could not be removed. You can close this dialog safely."
  }

  return "The doctor could not be saved. Check your connection and try again."
}

export function DoctorProfileDialog({
  initialDoctor,
  medicalSpecialties,
  onOpenChange,
  onSave,
  open,
}: DoctorProfileDialogProps) {
  const initialDraft = useMemo(() => createDoctorProfileDraft(initialDoctor), [initialDoctor])
  const [draft, setDraft] = useState(initialDraft)
  const [persistedDoctor, setPersistedDoctor] = useState(initialDoctor)
  const [baseline, setBaseline] = useState(() => draftFingerprint(initialDraft))
  const [saveState, setSaveState] = useState<"idle" | "saving">("idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [discardConfirmation, setDiscardConfirmation] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>()
  const imagePreviewUrlRef = useRef<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialFocusRef = useRef<HTMLSelectElement>(null)
  const validationErrors = getDoctorProfileDraftErrors(draft)
  const specialtyErrorTarget = validationErrors.specialties ? specialtyValidationTarget(draft) : undefined
  const isDirty = draftFingerprint(draft) !== baseline
  const assignedSpecialtyIds = new Set(
    draft.specialties.map(({ medicalSpecialtyId }) => medicalSpecialtyId).filter(Boolean),
  )
  const hasIncompleteSpecialty = draft.specialties.some(
    ({ medicalSpecialtyId, specializationLevel }) => !medicalSpecialtyId || !specializationLevel,
  )
  const hasAvailableSpecialty = medicalSpecialties.some(({ id }) => !assignedSpecialtyIds.has(id))
  const isSaving = saveState === "saving"
  const creationNeedsReload = draft.creationStatus === "unknown"

  useEffect(
    () => () => {
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current)
    },
    [],
  )

  const updateDraft = (update: Partial<DoctorProfileDraft>) => {
    setDraft((current) => ({ ...current, ...update }))
    setDiscardConfirmation(false)
  }

  const requestClose = () => {
    if (isSaving) return
    if (isDirty) {
      setDiscardConfirmation(true)
      return
    }
    onOpenChange(false)
  }

  const focusFirstInvalidField = () => {
    const specialtyControlId = specialtyErrorTarget
      ? specialtyErrorTarget.control === "level"
        ? `doctor-specialty-level-${specialtyErrorTarget.clientId}`
        : `doctor-specialty-${specialtyErrorTarget.clientId}`
      : undefined
    const candidates = [
      validationErrors.firstName ? "doctor-first-name" : undefined,
      validationErrors.lastName ? "doctor-last-name" : undefined,
      validationErrors.gender ? "doctor-gender" : undefined,
      validationErrors.experienceYears ? "doctor-experience-years" : undefined,
      validationErrors.biography ? "doctor-biography" : undefined,
      validationErrors.qualifications ? "doctor-qualifications" : undefined,
      validationErrors.languages ? "doctor-languages" : undefined,
      validationErrors.specialties ? specialtyControlId : undefined,
    ].filter(Boolean)
    const firstInvalidField = candidates[0] ? document.getElementById(candidates[0]) : undefined
    firstInvalidField?.focus({ preventScroll: false })
  }

  const save = async () => {
    if (isSaving) return
    if (Object.keys(validationErrors).length > 0) {
      setShowValidation(true)
      setStatusMessage("Review the highlighted fields.")
      requestAnimationFrame(focusFirstInvalidField)
      return
    }

    setSaveState("saving")
    setStatusMessage("")
    const result = await onSave(draft, persistedDoctor)
    setSaveState("idle")

    if (result.doctor) {
      setPersistedDoctor(result.doctor)
      const nextBaseline = createDoctorProfileDraft(result.doctor)
      setBaseline(draftFingerprint(nextBaseline))
    }
    setDraft(result.draft)
    if (!result.draft.imageFile && imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current)
      imagePreviewUrlRef.current = undefined
      setImagePreviewUrl(undefined)
    }
    if (result.status === "saved") {
      onOpenChange(false)
      return
    }
    setStatusMessage(saveFailureMessage(result, medicalSpecialties))
  }

  return (
    <Modal
      contentClassName="p-0 sm:p-0"
      footer={
        discardConfirmation ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-[var(--destructive)]" role="alert">
              Discard the unsaved changes?
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDiscardConfirmation(false)} variant="outline">
                Keep editing
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="destructive">
                Discard changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="text-sm" role="status">
              {statusMessage ||
                (creationNeedsReload
                  ? "Close this dialog and reload Doctors before trying to create this profile again."
                  : "")}
            </p>
            <div className="flex shrink-0 justify-end gap-2">
              <Button disabled={isSaving} onClick={requestClose} variant="outline">
                Cancel
              </Button>
              <Button disabled={isSaving || creationNeedsReload} onClick={save}>
                {isSaving ? "Saving…" : persistedDoctor ? "Save doctor" : "Add doctor"}
              </Button>
            </div>
          </div>
        )
      }
      footerClassName="bg-[var(--background)]"
      initialFocusRef={initialFocusRef}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : requestClose())}
      open={open}
      panelClassName="max-w-[59rem]"
      title={persistedDoctor ? "Edit doctor" : "Add doctor"}
    >
      <fieldset className="grid md:grid-cols-[minmax(17rem,0.34fr)_minmax(0,0.66fr)]" disabled={isSaving}>
        <legend className="sr-only">Doctor profile</legend>

        <section className="space-y-3 border-b border-[var(--border)] p-5 sm:p-6 md:border-r md:border-b-0">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar
                className="size-36 sm:size-40"
                initials={doctorInitials(persistedDoctor, draft) || "DR"}
                sizes="160px"
                src={imagePreviewUrl ?? persistedDoctor?.image?.url}
              />
              <input
                accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                aria-label="Profile photo"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  if (!file) return
                  if (file.size > 4 * 1024 * 1024) {
                    setStatusMessage("The selected image is larger than 4 MB.")
                    event.currentTarget.value = ""
                    return
                  }
                  if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current)
                  const nextPreviewUrl = URL.createObjectURL(file)
                  imagePreviewUrlRef.current = nextPreviewUrl
                  setImagePreviewUrl(nextPreviewUrl)
                  updateDraft({ imageFile: file })
                }}
                ref={fileInputRef}
                tabIndex={-1}
                type="file"
              />
              <Button
                aria-label={persistedDoctor?.image ? "Replace profile photo" : "Add profile photo"}
                className="absolute right-0 bottom-1 rounded-full border-[var(--border)] bg-[var(--background)] shadow-md"
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                variant="outline"
              >
                <Camera aria-hidden="true" className="size-4" />
              </Button>
            </div>
            <strong className="mt-3 text-sm">Profile photo</strong>
            <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
              JPG, PNG, WebP, AVIF or GIF up to 4 MB.
              <br />
              Recommended format: 1:1 square.
            </p>
            {draft.imageFile ? (
              <p className="mt-1 max-w-full truncate text-xs font-bold">{draft.imageFile.name}</p>
            ) : null}
          </div>

          <button
            aria-checked={draft.active}
            aria-label="Published profile"
            className="flex min-h-11 w-full items-start justify-between gap-4 border-t border-[var(--border)] pt-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            onClick={() => updateDraft({ active: !draft.active })}
            role="switch"
            type="button"
          >
            <span>
              <strong className="block text-sm">Publication status</strong>
              <span className="mt-1 block text-xs leading-5 text-[var(--foreground)]">
                When active, this profile is visible to patients.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={
                draft.active
                  ? "relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full bg-[var(--primary)] transition-colors"
                  : "relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] transition-colors"
              }
            >
              <span
                className={
                  draft.active
                    ? "absolute top-0.5 size-5 translate-x-5 rounded-full bg-[var(--on-primary)] shadow-sm transition-transform"
                    : "absolute top-0.5 size-5 translate-x-0.5 rounded-full bg-[var(--foreground)] shadow-sm transition-transform"
                }
              />
            </span>
          </button>

          <Field label="Title (optional)">
            {(controlProps) => (
              <Select
                {...controlProps}
                onValueChange={(title) => updateDraft({ title: title as DoctorProfileDraft["title"] })}
                ref={initialFocusRef}
                value={draft.title}
              >
                <option value="">No title</option>
                {doctorTitleValues.map((title) => (
                  <option key={title} value={title}>
                    {titleLabels[title]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            error={showValidation ? validationErrors.firstName : undefined}
            id="doctor-first-name"
            isRequired
            label="First name"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                autoComplete="given-name"
                maxLength={doctorProfileFieldLimits.shortTextLength}
                onValueChange={(firstName) => updateDraft({ firstName })}
                value={draft.firstName}
              />
            )}
          </Field>

          <Field
            error={showValidation ? validationErrors.lastName : undefined}
            id="doctor-last-name"
            isRequired
            label="Last name"
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                autoComplete="family-name"
                maxLength={doctorProfileFieldLimits.shortTextLength}
                onValueChange={(lastName) => updateDraft({ lastName })}
                value={draft.lastName}
              />
            )}
          </Field>

          <Field
            error={showValidation ? validationErrors.gender : undefined}
            id="doctor-gender"
            isRequired
            label="Gender"
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                onValueChange={(gender) => updateDraft({ gender: gender as DoctorProfileDraft["gender"] })}
                value={draft.gender}
              >
                <option value="">Select gender…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            )}
          </Field>

          <Field
            error={showValidation ? validationErrors.experienceYears : undefined}
            id="doctor-experience-years"
            label="Years of experience (optional)"
          >
            {(controlProps) => (
              <div className="relative">
                <Input
                  {...controlProps}
                  className="pr-16"
                  min={0}
                  onValueChange={(experienceYears) => updateDraft({ experienceYears })}
                  step={1}
                  type="number"
                  value={draft.experienceYears}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-xs text-[var(--foreground)]"
                >
                  years
                </span>
              </div>
            )}
          </Field>
          <p className="text-xs text-[var(--foreground)]">* Required field</p>
        </section>

        <section className="space-y-6 p-5 sm:p-7">
          <Field
            description="Add each academic or professional qualification as a tag."
            descriptionPlacement="before-control"
            error={showValidation ? validationErrors.qualifications : undefined}
            id="doctor-qualifications"
            isRequired
            label="Qualifications"
          >
            {(controlProps) => (
              <TagInput
                {...controlProps}
                allowCustomValues
                maxValueLength={doctorProfileFieldLimits.shortTextLength}
                maxValues={doctorProfileFieldLimits.qualificationCount}
                onValueChange={(qualifications) => updateDraft({ qualifications: qualifications.join("\n") })}
                placeholder="Type a qualification and press Enter…"
                value={qualificationValues(draft.qualifications)}
              />
            )}
          </Field>

          <Field
            description="Choose every language this doctor speaks."
            descriptionPlacement="before-control"
            error={showValidation ? validationErrors.languages : undefined}
            id="doctor-languages"
            isRequired
            label="Languages"
          >
            {(controlProps) => (
              <TagInput
                {...controlProps}
                onValueChange={(languages) =>
                  updateDraft({ languages: languages as readonly DoctorLanguage[] })
                }
                options={languageOptions}
                placeholder="Select languages…"
                value={draft.languages}
              />
            )}
          </Field>

          <Field
            description="Tell patients about background, experience and approach."
            descriptionPlacement="before-control"
            error={showValidation ? validationErrors.biography : undefined}
            id="doctor-biography"
            label="Biography"
          >
            {(controlProps) => (
              <Textarea
                {...controlProps}
                className="min-h-40"
                maxLength={doctorProfileFieldLimits.biographyLength}
                onValueChange={(biography) => updateDraft({ biography })}
                placeholder="Describe the doctor's experience and approach…"
                value={draft.biography}
              />
            )}
          </Field>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold">Medical specialties</h3>
              <p className="mt-1 text-xs text-[var(--foreground)]">
                Assign reviewed specialties and the doctor&apos;s level of specialization.
              </p>
            </div>

            {draft.specialties.length > 0 ? (
              <div className="space-y-2">
                <div
                  aria-hidden="true"
                  className="hidden grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_2.75rem] gap-3 px-1 text-[0.6875rem] font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid"
                >
                  <span>Specialty</span>
                  <span>Specialization level</span>
                  <span />
                </div>
                {draft.specialties.map((specialty, index) => {
                  const specialtyId = `doctor-specialty-${specialty.clientId}`
                  const levelId = `doctor-specialty-level-${specialty.clientId}`
                  const rowIsInvalid =
                    Boolean(showValidation && validationErrors.specialties) &&
                    specialtyErrorTarget?.clientId === specialty.clientId
                  const specialtyErrorId = "doctor-specialties-error"

                  return (
                    <div
                      className="grid gap-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_2.75rem]"
                      key={specialty.clientId}
                    >
                      <div className="grid gap-1.5">
                        <label className="text-xs font-bold sm:sr-only" htmlFor={specialtyId}>
                          Specialty {index + 1}
                        </label>
                        <Select
                          aria-describedby={rowIsInvalid ? specialtyErrorId : undefined}
                          aria-invalid={rowIsInvalid || undefined}
                          id={specialtyId}
                          onValueChange={(medicalSpecialtyId) =>
                            updateDraft({
                              specialties: draft.specialties.map((value) =>
                                value.clientId === specialty.clientId
                                  ? { ...value, medicalSpecialtyId }
                                  : value,
                              ),
                            })
                          }
                          value={specialty.medicalSpecialtyId}
                        >
                          <option value="">Select specialty…</option>
                          {medicalSpecialties.map((option) => (
                            <option
                              disabled={
                                option.id !== specialty.medicalSpecialtyId &&
                                assignedSpecialtyIds.has(option.id)
                              }
                              key={option.id}
                              value={option.id}
                            >
                              {option.parentSpecialtyName
                                ? `${option.parentSpecialtyName} — ${option.name}`
                                : option.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-bold sm:sr-only" htmlFor={levelId}>
                          Specialization level {index + 1}
                        </label>
                        <Select
                          aria-describedby={rowIsInvalid ? specialtyErrorId : undefined}
                          aria-invalid={rowIsInvalid || undefined}
                          id={levelId}
                          onValueChange={(specializationLevel) =>
                            updateDraft({
                              specialties: draft.specialties.map((value) =>
                                value.clientId === specialty.clientId
                                  ? {
                                      ...value,
                                      specializationLevel:
                                        specializationLevel as DoctorProfileDraft["specialties"][number]["specializationLevel"],
                                    }
                                  : value,
                              ),
                            })
                          }
                          value={specialty.specializationLevel}
                        >
                          <option value="">Select level…</option>
                          {doctorSpecializationLevelValues.map((level) => (
                            <option key={level} value={level}>
                              {levelLabels[level]}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {specialty.assignmentId ? (
                        <span aria-hidden="true" className="hidden sm:block" />
                      ) : (
                        <Button
                          aria-label={`Discard specialty row ${index + 1}`}
                          className="justify-self-end sm:self-start"
                          onClick={() =>
                            updateDraft({
                              specialties: draft.specialties.filter(
                                ({ clientId }) => clientId !== specialty.clientId,
                              ),
                            })
                          }
                          size="icon"
                          variant="ghost"
                        >
                          <X aria-hidden="true" className="size-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground)]">No specialties assigned yet.</p>
            )}

            {showValidation && validationErrors.specialties ? (
              <p
                className="text-xs font-bold text-[var(--destructive)]"
                id="doctor-specialties-error"
                role="alert"
              >
                {validationErrors.specialties}
              </p>
            ) : null}

            <Button
              className="px-1 text-[var(--primary)] hover:text-[var(--primary)]"
              disabled={!hasAvailableSpecialty || hasIncompleteSpecialty}
              onClick={() =>
                updateDraft({
                  specialties: [
                    ...draft.specialties,
                    {
                      clientId: globalThis.crypto.randomUUID(),
                      medicalSpecialtyId: "",
                      specializationLevel: "",
                    },
                  ],
                })
              }
              size="small"
              variant="ghost"
            >
              <CirclePlus aria-hidden="true" className="size-4" />
              Add specialty
            </Button>
          </div>
        </section>
      </fieldset>
    </Modal>
  )
}
