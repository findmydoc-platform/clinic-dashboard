import { doctorProfileFieldLimits } from "./doctor-profile"
import type {
  DoctorGender,
  DoctorLanguage,
  DoctorProfile,
  DoctorProfileFields,
  DoctorSpecializationLevel,
  DoctorTitle,
} from "./doctor-profile"
import type { DoctorProfileCommands } from "./doctor-profile-commands"

export type DoctorSpecialtyDraft = Readonly<{
  assignmentId?: string
  clientId: string
  medicalSpecialtyId: string
  specializationLevel: DoctorSpecializationLevel | ""
}>

export type DoctorProfileDraft = Readonly<{
  active: boolean
  activationPending: boolean
  biography: string
  creationStatus: "ready" | "unknown"
  doctorId?: string
  experienceYears: string
  firstName: string
  gender: DoctorGender | ""
  imageFile?: File
  languages: readonly DoctorLanguage[]
  lastName: string
  qualifications: string
  specialties: readonly DoctorSpecialtyDraft[]
  title: DoctorTitle | ""
}>

export type DoctorProfileSaveResult = Readonly<{
  doctor?: DoctorProfile
  draft: DoctorProfileDraft
  failedSteps: readonly string[]
  status: "failed" | "partial" | "saved"
}>

export type DoctorProfileDraftErrors = Readonly<
  Partial<
    Record<
      | "experienceYears"
      | "firstName"
      | "gender"
      | "languages"
      | "lastName"
      | "biography"
      | "qualifications"
      | "specialties",
      string
    >
  >
>

function profileFieldsFromDraft(draft: DoctorProfileDraft): DoctorProfileFields {
  const experienceYears = draft.experienceYears.trim()
  return {
    biography: draft.biography.trim() || undefined,
    experienceYears: experienceYears ? Number(experienceYears) : undefined,
    firstName: draft.firstName.trim(),
    gender: draft.gender || "female",
    languages: [...draft.languages],
    lastName: draft.lastName.trim(),
    qualifications: draft.qualifications
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    title: draft.title || undefined,
  }
}

function mergeSpecialty(
  specialties: readonly DoctorProfile["specialties"][number][],
  assignment: DoctorProfile["specialties"][number],
) {
  const withoutAssignment = specialties.filter(({ id }) => id !== assignment.id)
  return [...withoutAssignment, assignment]
}

function valuesEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function profileMatchesDraft(doctor: DoctorProfile, fields: DoctorProfileFields, active: boolean) {
  return (
    doctor.active === active &&
    (doctor.biography ?? "") === (fields.biography ?? "") &&
    doctor.experienceYears === fields.experienceYears &&
    doctor.firstName === fields.firstName &&
    doctor.gender === fields.gender &&
    valuesEqual(doctor.languages, fields.languages) &&
    doctor.lastName === fields.lastName &&
    valuesEqual(doctor.qualifications, fields.qualifications) &&
    doctor.title === fields.title
  )
}

export function createDoctorProfileDraft(doctor?: DoctorProfile): DoctorProfileDraft {
  return {
    active: doctor?.active ?? true,
    activationPending: false,
    biography: doctor?.biography ?? "",
    creationStatus: "ready",
    doctorId: doctor?.id,
    experienceYears: doctor?.experienceYears?.toString() ?? "",
    firstName: doctor?.firstName ?? "",
    gender: doctor?.gender ?? "",
    languages: doctor?.languages ?? [],
    lastName: doctor?.lastName ?? "",
    qualifications: doctor?.qualifications.join("\n") ?? "",
    specialties:
      doctor?.specialties.map((specialty) => ({
        assignmentId: specialty.id,
        clientId: specialty.id,
        medicalSpecialtyId: specialty.medicalSpecialtyId,
        specializationLevel: specialty.specializationLevel,
      })) ?? [],
    title: doctor?.title ?? "",
  }
}

export function getDoctorProfileDraftErrors(draft: DoctorProfileDraft): DoctorProfileDraftErrors {
  const errors: Partial<Record<keyof DoctorProfileDraftErrors, string>> = {}
  const firstName = draft.firstName.trim()
  const lastName = draft.lastName.trim()
  const biography = draft.biography.trim()
  const qualifications = profileFieldsFromDraft(draft).qualifications
  if (!firstName) {
    errors.firstName = "Enter a first name."
  } else if (firstName.length > doctorProfileFieldLimits.shortTextLength) {
    errors.firstName = `First name must be ${doctorProfileFieldLimits.shortTextLength} characters or fewer.`
  }
  if (!lastName) {
    errors.lastName = "Enter a last name."
  } else if (lastName.length > doctorProfileFieldLimits.shortTextLength) {
    errors.lastName = `Last name must be ${doctorProfileFieldLimits.shortTextLength} characters or fewer.`
  }
  if (!draft.gender) errors.gender = "Select a gender."
  if (draft.languages.length === 0) {
    errors.languages = "Select at least one language."
  } else if (new Set(draft.languages).size !== draft.languages.length) {
    errors.languages = "Each language can only be selected once."
  }
  if (biography.length > doctorProfileFieldLimits.biographyLength) {
    errors.biography = `Biography must be ${doctorProfileFieldLimits.biographyLength.toLocaleString(
      "en",
    )} characters or fewer.`
  }
  if (!qualifications.length) {
    errors.qualifications = "Enter at least one qualification."
  } else if (qualifications.length > doctorProfileFieldLimits.qualificationCount) {
    errors.qualifications = `Enter no more than ${doctorProfileFieldLimits.qualificationCount} qualifications.`
  } else if (
    qualifications.some((qualification) => qualification.length > doctorProfileFieldLimits.shortTextLength)
  ) {
    errors.qualifications = `Each qualification must be ${doctorProfileFieldLimits.shortTextLength} characters or fewer.`
  }
  if (
    draft.experienceYears.trim() &&
    (!Number.isInteger(Number(draft.experienceYears)) || Number(draft.experienceYears) < 0)
  ) {
    errors.experienceYears = "Enter a non-negative whole number."
  }
  if (draft.specialties.some(({ medicalSpecialtyId }) => !medicalSpecialtyId)) {
    errors.specialties = "Select a specialty for every added row."
  } else if (draft.specialties.some(({ specializationLevel }) => !specializationLevel)) {
    errors.specialties = "Select a specialization level for every added row."
  } else {
    const specialtyIds = draft.specialties.map(({ medicalSpecialtyId }) => medicalSpecialtyId)
    if (new Set(specialtyIds).size !== specialtyIds.length) {
      errors.specialties = "Each specialty can only be assigned once."
    }
  }
  return errors
}

export function getDoctorProfileDraftError(draft: DoctorProfileDraft) {
  return Object.values(getDoctorProfileDraftErrors(draft))[0]
}

export async function saveDoctorProfileDraft(
  commands: DoctorProfileCommands,
  draft: DoctorProfileDraft,
  initialDoctor?: DoctorProfile,
): Promise<DoctorProfileSaveResult> {
  if (getDoctorProfileDraftError(draft)) {
    return { draft, failedSteps: ["validation"], status: "failed" }
  }
  if (draft.creationStatus === "unknown") {
    return { draft, failedSteps: ["profile-uncertain"], status: "failed" }
  }

  const fields = profileFieldsFromDraft(draft)
  let doctor = initialDoctor

  if (!draft.doctorId) {
    try {
      doctor = await commands.createDoctor(fields)
    } catch {
      return {
        draft: { ...draft, creationStatus: "unknown" },
        failedSteps: ["profile-uncertain"],
        status: "failed",
      }
    }
  }

  const doctorId = draft.doctorId ?? doctor?.id
  if (!doctorId || !doctor) {
    return { draft, failedSteps: ["profile"], status: "failed" }
  }

  const nextDraft: DoctorProfileDraft = {
    ...draft,
    activationPending: draft.activationPending || (!draft.doctorId && draft.active),
    creationStatus: "ready",
    doctorId,
  }
  const operations: Array<
    Promise<
      | Readonly<{
          cleanupPending: boolean
          kind: "image"
          profile: DoctorProfile
        }>
      | Readonly<{
          assignment: DoctorProfile["specialties"][number]
          clientId: string
          kind: "specialty"
        }>
      | Readonly<{ kind: "profile"; profile: DoctorProfile }>
    >
  > = []

  const shouldDeferActivation = nextDraft.activationPending && draft.active
  const targetActive = shouldDeferActivation ? false : draft.active

  if (draft.doctorId && !profileMatchesDraft(doctor, fields, targetActive)) {
    operations.push(
      commands
        .updateDoctor(doctorId, {
          ...fields,
          active: targetActive,
          biography: fields.biography ?? null,
          experienceYears: fields.experienceYears ?? null,
          title: fields.title ?? null,
        })
        .then((profile) => ({ kind: "profile" as const, profile })),
    )
  }
  if (draft.imageFile) {
    operations.push(
      commands
        .replaceImage(doctorId, {
          alt: `Portrait of ${fields.firstName} ${fields.lastName}`,
          file: draft.imageFile,
        })
        .then(({ cleanupPending, profile }) => ({
          cleanupPending,
          kind: "image" as const,
          profile,
        })),
    )
  }
  for (const specialty of draft.specialties) {
    if (!specialty.medicalSpecialtyId || !specialty.specializationLevel) continue
    const persistedSpecialty = specialty.assignmentId
      ? doctor.specialties.find(({ id }) => id === specialty.assignmentId)
      : undefined
    if (
      persistedSpecialty?.medicalSpecialtyId === specialty.medicalSpecialtyId &&
      persistedSpecialty.specializationLevel === specialty.specializationLevel
    ) {
      continue
    }
    const input = {
      medicalSpecialtyId: specialty.medicalSpecialtyId,
      specializationLevel: specialty.specializationLevel,
    }
    const request = specialty.assignmentId
      ? commands.updateSpecialty(doctorId, specialty.assignmentId, input)
      : commands.createSpecialty(doctorId, input)
    operations.push(
      request.then((assignment) => ({
        assignment,
        clientId: specialty.clientId,
        kind: "specialty" as const,
      })),
    )
  }

  const results = await Promise.allSettled(operations)
  const failedSteps: string[] = []
  let updatedDraft = nextDraft

  for (const result of results) {
    if (result.status === "rejected") {
      failedSteps.push("save")
      continue
    }
    if (result.value.kind === "profile") {
      doctor = {
        ...result.value.profile,
        specialties: doctor.specialties,
      }
      continue
    }
    if (result.value.kind === "image") {
      doctor = { ...doctor, image: result.value.profile.image }
      updatedDraft = { ...updatedDraft, imageFile: undefined }
      if (result.value.cleanupPending) failedSteps.push("image-cleanup")
      continue
    }
    const specialtyResult = result.value

    doctor = {
      ...doctor,
      specialties: mergeSpecialty(doctor.specialties, specialtyResult.assignment),
    }
    updatedDraft = {
      ...updatedDraft,
      specialties: updatedDraft.specialties.map((specialty) =>
        specialty.clientId === specialtyResult.clientId
          ? { ...specialty, assignmentId: specialtyResult.assignment.id }
          : specialty,
      ),
    }
  }

  const hasBlockingFollowUpFailure = failedSteps.some((step) => step !== "image-cleanup")
  if (updatedDraft.activationPending && !updatedDraft.active) {
    updatedDraft = { ...updatedDraft, activationPending: false }
  } else if (updatedDraft.activationPending && updatedDraft.active && !hasBlockingFollowUpFailure) {
    try {
      const activatedDoctor = await commands.updateDoctor(doctorId, { active: true })
      doctor = {
        ...activatedDoctor,
        image: doctor.image,
        specialties: doctor.specialties,
      }
      updatedDraft = { ...updatedDraft, activationPending: false }
    } catch {
      failedSteps.push("activation")
    }
  }

  if (failedSteps.length > 0) {
    return { doctor, draft: updatedDraft, failedSteps, status: "partial" }
  }
  return { doctor, draft: updatedDraft, failedSteps: [], status: "saved" }
}
