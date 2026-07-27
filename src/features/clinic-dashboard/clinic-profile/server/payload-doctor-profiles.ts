import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import {
  doctorGenderValues,
  doctorLanguageValues,
  doctorSpecializationLevelValues,
  doctorTitleValues,
  type DoctorProfile,
  type DoctorSpecialtyAssignment,
  type MedicalSpecialtyOption,
} from "../model/doctor-profile"
import type {
  DoctorProfileChangeError,
  DoctorProfileProvider,
  DoctorProfileReadError,
} from "./doctor-profile-provider"

const relationshipIdSchema = z.union([z.string(), z.number()]).transform(String)
const relationshipSchema = z.union([
  relationshipIdSchema,
  z
    .object({
      id: relationshipIdSchema,
    })
    .passthrough(),
])
const imageRelationshipSchema = z.union([
  relationshipIdSchema,
  z.object({
    alt: z.string(),
    id: relationshipIdSchema,
    url: z.string().nullish(),
  }),
])
const rawDoctorSchema = z.object({
  active: z.boolean(),
  biography: z.string().nullish(),
  clinic: relationshipSchema,
  experienceYears: z.number().int().nonnegative().nullish(),
  firstName: z.string().min(1),
  gender: z.enum(doctorGenderValues),
  id: relationshipIdSchema,
  languages: z.array(z.enum(doctorLanguageValues)),
  lastName: z.string().min(1),
  profileImage: imageRelationshipSchema.nullish(),
  qualifications: z.array(z.string()),
  title: z.enum(doctorTitleValues).nullish(),
})
const rawMedicalSpecialtySchema = z.object({
  id: relationshipIdSchema,
  name: z.string().min(1),
  parentSpecialty: relationshipSchema.nullish(),
})
const rawDoctorSpecialtySchema = z.object({
  doctor: relationshipSchema,
  id: relationshipIdSchema,
  medicalSpecialty: relationshipSchema,
  specializationLevel: z.enum(doctorSpecializationLevelValues),
})
const rawDoctorMediaSchema = z.object({
  alt: z.string(),
  clinic: relationshipSchema,
  doctor: relationshipSchema,
  id: relationshipIdSchema,
  url: z.string().nullish(),
})
const doctorListSchema = z.object({ docs: z.array(rawDoctorSchema) })
const specialtyListSchema = z.object({ docs: z.array(rawMedicalSpecialtySchema) })
const doctorSpecialtyListSchema = z.object({ docs: z.array(rawDoctorSpecialtySchema) })
const doctorResponseSchema = z.union([z.object({ doc: rawDoctorSchema }), rawDoctorSchema])
const doctorSpecialtyResponseSchema = z.union([
  z.object({ doc: rawDoctorSpecialtySchema }),
  rawDoctorSpecialtySchema,
])
const doctorMediaResponseSchema = z.union([z.object({ doc: rawDoctorMediaSchema }), rawDoctorMediaSchema])

type PayloadResponse =
  | Readonly<{
      ok: true
      value: unknown
    }>
  | Readonly<{
      ok: false
      status?: number
    }>

function relationshipId(value: z.infer<typeof relationshipSchema>) {
  return typeof value === "string" ? value : value.id
}

function relationshipName(value: z.infer<typeof relationshipSchema>) {
  return typeof value !== "string" && typeof value.name === "string" ? value.name : undefined
}

function endpointFor(pathname: string) {
  return new URL(pathname, validateEnvironment().PAYLOAD_API_URL)
}

function requestHeaders(accessToken: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  }
}

function readErrorForStatus(status: number | undefined): DoctorProfileReadError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  return "temporarily-unavailable"
}

function changeErrorForStatus(status: number | undefined): DoctorProfileChangeError {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not-found"
  if (status === 400 || status === 409 || status === 422) return "conflict"
  return "temporarily-unavailable"
}

async function requestPayloadJson(
  endpoint: URL,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<PayloadResponse> {
  try {
    const response = await fetcher(endpoint, init)
    if (!response.ok) return { ok: false, status: response.status }
    return { ok: true, value: await response.json().catch(() => null) }
  } catch {
    return { ok: false }
  }
}

async function requestPayload(
  endpoint: URL,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<Readonly<{ ok: boolean; status?: number }>> {
  try {
    const response = await fetcher(endpoint, init)
    return response.ok ? { ok: true } : { ok: false, status: response.status }
  } catch {
    return { ok: false }
  }
}

function mutationInit(
  accessToken: string,
  method: "PATCH" | "POST",
  body: Record<string, unknown>,
): RequestInit {
  return {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      ...requestHeaders(accessToken),
      "Content-Type": "application/json",
    },
    method,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  }
}

function readInit(accessToken: string): RequestInit {
  return {
    cache: "no-store",
    headers: requestHeaders(accessToken),
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  }
}

function absoluteMediaUrl(value: string | null | undefined) {
  if (!value) return undefined
  try {
    return new URL(value, validateEnvironment().PAYLOAD_API_URL).toString()
  } catch {
    return undefined
  }
}

function mapImage(value: z.infer<typeof imageRelationshipSchema> | null | undefined) {
  if (!value || typeof value === "string") return undefined

  return {
    alt: value.alt,
    id: value.id,
    url: absoluteMediaUrl(value.url),
  }
}

function mapDoctor(
  rawDoctor: z.infer<typeof rawDoctorSchema>,
  clinicId: string,
  specialties: readonly DoctorSpecialtyAssignment[],
): DoctorProfile {
  if (relationshipId(rawDoctor.clinic) !== clinicId) {
    throw new Error("Doctor clinic mismatch")
  }

  return {
    active: rawDoctor.active,
    biography: rawDoctor.biography?.trim() || undefined,
    experienceYears: rawDoctor.experienceYears ?? undefined,
    firstName: rawDoctor.firstName,
    gender: rawDoctor.gender,
    id: rawDoctor.id,
    image: mapImage(rawDoctor.profileImage),
    languages: [...rawDoctor.languages],
    lastName: rawDoctor.lastName,
    qualifications: [...rawDoctor.qualifications],
    specialties: [...specialties],
    title: rawDoctor.title ?? undefined,
  }
}

function mapMedicalSpecialty(
  rawSpecialty: z.infer<typeof rawMedicalSpecialtySchema>,
  specialtyNameById: ReadonlyMap<string, string>,
): MedicalSpecialtyOption {
  const parentSpecialtyId = rawSpecialty.parentSpecialty
    ? relationshipId(rawSpecialty.parentSpecialty)
    : undefined
  const parentSpecialtyName = rawSpecialty.parentSpecialty
    ? (relationshipName(rawSpecialty.parentSpecialty) ?? specialtyNameById.get(parentSpecialtyId ?? ""))
    : undefined

  return {
    id: rawSpecialty.id,
    name: rawSpecialty.name,
    parentSpecialtyId,
    parentSpecialtyName,
  }
}

function mapDoctorSpecialty(
  rawSpecialty: z.infer<typeof rawDoctorSpecialtySchema>,
  specialtyNameById: ReadonlyMap<string, string>,
): DoctorSpecialtyAssignment {
  const medicalSpecialtyId = relationshipId(rawSpecialty.medicalSpecialty)
  const medicalSpecialtyName =
    relationshipName(rawSpecialty.medicalSpecialty) ?? specialtyNameById.get(medicalSpecialtyId)
  if (!medicalSpecialtyName) throw new Error("Doctor specialty name is missing")

  return {
    id: rawSpecialty.id,
    medicalSpecialtyId,
    medicalSpecialtyName,
    specializationLevel: rawSpecialty.specializationLevel,
  }
}

function rawDocument<TValue extends object>(value: TValue | Readonly<{ doc: TValue }>) {
  return "doc" in value ? value.doc : value
}

function scopedDoctorsEndpoint(clinicId: string) {
  const endpoint = endpointFor("/api/doctors")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "100")
  endpoint.searchParams.set("pagination", "false")
  endpoint.searchParams.set("where[clinic][equals]", clinicId)
  return endpoint
}

function scopedDoctorEndpoint(clinicId: string, doctorId: string) {
  const endpoint = scopedDoctorsEndpoint(clinicId)
  endpoint.searchParams.set("limit", "1")
  endpoint.searchParams.set("where[and][0][clinic][equals]", clinicId)
  endpoint.searchParams.set("where[and][1][id][equals]", doctorId)
  endpoint.searchParams.delete("where[clinic][equals]")
  return endpoint
}

function conditionalDoctorImageEndpoint(
  clinicId: string,
  doctorId: string,
  previousImageId: string | undefined,
) {
  const endpoint = endpointFor("/api/doctors")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "1")
  endpoint.searchParams.set("where[and][0][clinic][equals]", clinicId)
  endpoint.searchParams.set("where[and][1][id][equals]", doctorId)
  if (previousImageId) {
    endpoint.searchParams.set("where[and][2][profileImage][equals]", previousImageId)
  } else {
    endpoint.searchParams.set("where[and][2][profileImage][exists]", "false")
  }
  return endpoint
}

function medicalSpecialtiesEndpoint() {
  const endpoint = endpointFor("/api/medical-specialties")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "500")
  endpoint.searchParams.set("pagination", "false")
  endpoint.searchParams.set("sort", "name")
  return endpoint
}

function doctorSpecialtiesEndpoint(doctorIds: readonly string[]) {
  const endpoint = endpointFor("/api/doctorspecialties")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "1000")
  endpoint.searchParams.set("pagination", "false")
  endpoint.searchParams.set("where[doctor][in]", doctorIds.join(","))
  return endpoint
}

function doctorSpecialtyEndpoint(doctorId: string, assignmentId: string) {
  const endpoint = endpointFor("/api/doctorspecialties")
  endpoint.searchParams.set("depth", "1")
  endpoint.searchParams.set("limit", "1")
  endpoint.searchParams.set("where[and][0][doctor][equals]", doctorId)
  endpoint.searchParams.set("where[and][1][id][equals]", assignmentId)
  return endpoint
}

function writeDoctorBody(input: Record<string, unknown>, clinicId?: string) {
  return {
    ...input,
    ...(clinicId ? { clinic: clinicId } : {}),
  }
}

function sortDoctors(left: DoctorProfile, right: DoctorProfile) {
  return (
    left.lastName.localeCompare(right.lastName, "en") || left.firstName.localeCompare(right.firstName, "en")
  )
}

export function createPayloadDoctorProfileProvider(
  accessToken: string,
  clinicId: string,
  fetcher: typeof fetch = fetch,
): DoctorProfileProvider {
  async function loadRawDoctor(doctorId: string) {
    const response = await requestPayloadJson(
      scopedDoctorEndpoint(clinicId, doctorId),
      readInit(accessToken),
      fetcher,
    )
    if (!response.ok) return response

    const parsed = doctorListSchema.safeParse(response.value)
    if (!parsed.success) return { ok: false } as const
    const doctor = parsed.data.docs[0]
    return doctor ? ({ ok: true, value: doctor } as const) : ({ ok: false, status: 404 } as const)
  }

  async function loadRawMedicalSpecialties() {
    const response = await requestPayloadJson(medicalSpecialtiesEndpoint(), readInit(accessToken), fetcher)
    if (!response.ok) return response

    const parsed = specialtyListSchema.safeParse(response.value)
    return parsed.success ? ({ ok: true, value: parsed.data.docs } as const) : ({ ok: false } as const)
  }

  async function loadRawDoctorSpecialties(doctorIds: readonly string[]) {
    if (doctorIds.length === 0) return { ok: true, value: [] } as const

    const response = await requestPayloadJson(
      doctorSpecialtiesEndpoint(doctorIds),
      readInit(accessToken),
      fetcher,
    )
    if (!response.ok) return response

    const parsed = doctorSpecialtyListSchema.safeParse(response.value)
    return parsed.success ? ({ ok: true, value: parsed.data.docs } as const) : ({ ok: false } as const)
  }

  async function loadCatalog() {
    const response = await loadRawMedicalSpecialties()
    if (!response.ok) return response

    const nameById = new Map(response.value.map((specialty) => [specialty.id, specialty.name]))
    return {
      ok: true,
      value: {
        nameById,
        specialties: response.value.map((specialty) => mapMedicalSpecialty(specialty, nameById)),
      },
    } as const
  }

  async function loadDoctorSpecialties(doctorId: string) {
    const [assignments, catalog] = await Promise.all([loadRawDoctorSpecialties([doctorId]), loadCatalog()])
    if (!assignments.ok) return assignments
    if (!catalog.ok) return catalog

    try {
      return {
        ok: true,
        value: assignments.value
          .filter((assignment) => relationshipId(assignment.doctor) === doctorId)
          .map((assignment) => mapDoctorSpecialty(assignment, catalog.value.nameById)),
      } as const
    } catch {
      return { ok: false } as const
    }
  }

  async function deleteDoctorMedia(mediaId: string) {
    const result = await requestPayload(
      endpointFor(`/api/doctorMedia/${encodeURIComponent(mediaId)}`),
      {
        cache: "no-store",
        headers: requestHeaders(accessToken),
        method: "DELETE",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      },
      fetcher,
    )
    return result.ok
  }

  async function findDoctorSpecialty(
    doctorId: string,
    medicalSpecialtyId: string,
    specializationLevel: DoctorSpecialtyAssignment["specializationLevel"],
    nameById: ReadonlyMap<string, string>,
  ) {
    const assignments = await loadRawDoctorSpecialties([doctorId])
    if (!assignments.ok) return assignments

    try {
      const matchingAssignment = assignments.value
        .filter((assignment) => relationshipId(assignment.doctor) === doctorId)
        .map((assignment) => mapDoctorSpecialty(assignment, nameById))
        .find(
          (assignment) =>
            assignment.medicalSpecialtyId === medicalSpecialtyId &&
            assignment.specializationLevel === specializationLevel,
        )
      return matchingAssignment
        ? ({ ok: true, value: matchingAssignment } as const)
        : ({ ok: false, status: 404 } as const)
    } catch {
      return { ok: false } as const
    }
  }

  return {
    async createDoctor(input) {
      try {
        const endpoint = endpointFor("/api/doctors")
        endpoint.searchParams.set("depth", "1")
        const response = await requestPayloadJson(
          endpoint,
          mutationInit(accessToken, "POST", writeDoctorBody({ ...input, active: false }, clinicId)),
          fetcher,
        )
        if (!response.ok) return { error: changeErrorForStatus(response.status), ok: false }

        const parsed = doctorResponseSchema.safeParse(response.value)
        if (!parsed.success) return { error: "invalid-data", ok: false }
        return { ok: true, value: mapDoctor(rawDocument(parsed.data), clinicId, []) }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
    async createSpecialty(doctorId, input) {
      try {
        const [doctor, catalog] = await Promise.all([loadRawDoctor(doctorId), loadCatalog()])
        if (!doctor.ok) return { error: changeErrorForStatus(doctor.status), ok: false }
        if (!catalog.ok) return { error: changeErrorForStatus(catalog.status), ok: false }
        if (!catalog.value.nameById.has(input.medicalSpecialtyId)) {
          return { error: "not-found", ok: false }
        }

        const existingAssignment = await findDoctorSpecialty(
          doctorId,
          input.medicalSpecialtyId,
          input.specializationLevel,
          catalog.value.nameById,
        )
        if (existingAssignment.ok) return existingAssignment

        const endpoint = endpointFor("/api/doctorspecialties")
        endpoint.searchParams.set("depth", "1")
        const response = await requestPayloadJson(
          endpoint,
          mutationInit(accessToken, "POST", {
            doctor: doctorId,
            medicalSpecialty: input.medicalSpecialtyId,
            specializationLevel: input.specializationLevel,
          }),
          fetcher,
        )
        if (!response.ok) {
          const reconciledAssignment = await findDoctorSpecialty(
            doctorId,
            input.medicalSpecialtyId,
            input.specializationLevel,
            catalog.value.nameById,
          )
          return reconciledAssignment.ok
            ? reconciledAssignment
            : { error: changeErrorForStatus(response.status), ok: false }
        }

        const parsed = doctorSpecialtyResponseSchema.safeParse(response.value)
        if (!parsed.success) {
          const reconciledAssignment = await findDoctorSpecialty(
            doctorId,
            input.medicalSpecialtyId,
            input.specializationLevel,
            catalog.value.nameById,
          )
          return reconciledAssignment.ok ? reconciledAssignment : { error: "invalid-data", ok: false }
        }
        const assignment = rawDocument(parsed.data)
        if (relationshipId(assignment.doctor) !== doctorId) {
          return { error: "invalid-data", ok: false }
        }
        return { ok: true, value: mapDoctorSpecialty(assignment, catalog.value.nameById) }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
    async loadDirectory() {
      try {
        const [doctorResponse, catalog] = await Promise.all([
          requestPayloadJson(scopedDoctorsEndpoint(clinicId), readInit(accessToken), fetcher),
          loadCatalog(),
        ])
        if (!doctorResponse.ok) {
          return { error: readErrorForStatus(doctorResponse.status), ok: false }
        }
        if (!catalog.ok) return { error: readErrorForStatus(catalog.status), ok: false }

        const doctorsParsed = doctorListSchema.safeParse(doctorResponse.value)
        if (!doctorsParsed.success) return { error: "temporarily-unavailable", ok: false }
        const doctorIds = doctorsParsed.data.docs.map((doctor) => doctor.id)
        const assignmentsResponse = await loadRawDoctorSpecialties(doctorIds)
        if (!assignmentsResponse.ok) {
          return { error: readErrorForStatus(assignmentsResponse.status), ok: false }
        }

        const assignmentsByDoctorId = new Map<string, DoctorSpecialtyAssignment[]>()
        for (const rawAssignment of assignmentsResponse.value) {
          const doctorId = relationshipId(rawAssignment.doctor)
          if (!doctorIds.includes(doctorId)) continue
          const assignment = mapDoctorSpecialty(rawAssignment, catalog.value.nameById)
          const assignments = assignmentsByDoctorId.get(doctorId) ?? []
          assignments.push(assignment)
          assignmentsByDoctorId.set(doctorId, assignments)
        }

        return {
          ok: true,
          value: {
            doctors: doctorsParsed.data.docs
              .map((doctor) => mapDoctor(doctor, clinicId, assignmentsByDoctorId.get(doctor.id) ?? []))
              .sort(sortDoctors),
            medicalSpecialties: catalog.value.specialties,
            status: "ready",
          },
        }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
    async replaceImage(doctorId, input) {
      try {
        const doctorResponse = await loadRawDoctor(doctorId)
        if (!doctorResponse.ok) {
          return { error: changeErrorForStatus(doctorResponse.status), ok: false }
        }
        const specialtiesResponse = await loadDoctorSpecialties(doctorId)
        if (!specialtiesResponse.ok) {
          return { error: changeErrorForStatus(specialtiesResponse.status), ok: false }
        }

        const previousImage =
          doctorResponse.value.profileImage && typeof doctorResponse.value.profileImage !== "string"
            ? doctorResponse.value.profileImage.id
            : doctorResponse.value.profileImage

        const upload = new FormData()
        upload.set(
          "_payload",
          JSON.stringify({
            alt: input.alt,
            clinic: clinicId,
            doctor: doctorId,
          }),
        )
        const fileBytes = new Uint8Array(input.bytes.byteLength)
        fileBytes.set(input.bytes)
        upload.set(
          "file",
          new File([fileBytes.buffer], input.fileName, {
            type: input.mimeType,
          }),
        )

        const mediaEndpoint = endpointFor("/api/doctorMedia")
        mediaEndpoint.searchParams.set("depth", "1")
        const mediaResponse = await requestPayloadJson(
          mediaEndpoint,
          {
            body: upload,
            cache: "no-store",
            headers: requestHeaders(accessToken),
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(12_000),
          },
          fetcher,
        )
        if (!mediaResponse.ok) {
          return { error: changeErrorForStatus(mediaResponse.status), ok: false }
        }

        const parsedMedia = doctorMediaResponseSchema.safeParse(mediaResponse.value)
        if (!parsedMedia.success) return { error: "invalid-data", ok: false }
        const media = rawDocument(parsedMedia.data)
        if (relationshipId(media.doctor) !== doctorId || relationshipId(media.clinic) !== clinicId) {
          await deleteDoctorMedia(media.id)
          return { error: "invalid-data", ok: false }
        }

        const doctorEndpoint = conditionalDoctorImageEndpoint(clinicId, doctorId, previousImage || undefined)
        const updateResponse = await requestPayloadJson(
          doctorEndpoint,
          mutationInit(accessToken, "PATCH", { profileImage: media.id }),
          fetcher,
        )
        if (!updateResponse.ok) {
          await deleteDoctorMedia(media.id)
          return { error: changeErrorForStatus(updateResponse.status), ok: false }
        }

        const parsedDoctor = doctorListSchema.safeParse(updateResponse.value)
        const updatedRawDoctor = parsedDoctor.success ? parsedDoctor.data.docs[0] : undefined
        if (!updatedRawDoctor) {
          await deleteDoctorMedia(media.id)
          return { error: parsedDoctor.success ? "conflict" : "invalid-data", ok: false }
        }

        const updatedDoctor = mapDoctor(updatedRawDoctor, clinicId, specialtiesResponse.value)
        if (updatedDoctor.image?.id !== media.id) {
          await deleteDoctorMedia(media.id)
          return { error: "invalid-data", ok: false }
        }
        let cleanupPending = false
        if (previousImage && previousImage !== media.id) {
          cleanupPending = !(await deleteDoctorMedia(previousImage))
        }
        return {
          ok: true,
          value: {
            cleanupPending,
            profile: updatedDoctor,
          },
        }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
    async updateDoctor(doctorId, input) {
      try {
        const doctor = await loadRawDoctor(doctorId)
        if (!doctor.ok) return { error: changeErrorForStatus(doctor.status), ok: false }
        const specialties = await loadDoctorSpecialties(doctorId)
        if (!specialties.ok) return { error: changeErrorForStatus(specialties.status), ok: false }

        const endpoint = endpointFor(`/api/doctors/${encodeURIComponent(doctorId)}`)
        endpoint.searchParams.set("depth", "1")
        const response = await requestPayloadJson(
          endpoint,
          mutationInit(accessToken, "PATCH", writeDoctorBody({ ...input })),
          fetcher,
        )
        if (!response.ok) return { error: changeErrorForStatus(response.status), ok: false }

        const parsed = doctorResponseSchema.safeParse(response.value)
        if (!parsed.success) return { error: "invalid-data", ok: false }
        return {
          ok: true,
          value: mapDoctor(rawDocument(parsed.data), clinicId, specialties.value),
        }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
    async updateSpecialty(doctorId, assignmentId, input) {
      try {
        const [doctor, assignmentResponse, catalog] = await Promise.all([
          loadRawDoctor(doctorId),
          requestPayloadJson(doctorSpecialtyEndpoint(doctorId, assignmentId), readInit(accessToken), fetcher),
          loadCatalog(),
        ])
        if (!doctor.ok) return { error: changeErrorForStatus(doctor.status), ok: false }
        if (!assignmentResponse.ok) {
          return { error: changeErrorForStatus(assignmentResponse.status), ok: false }
        }
        if (!catalog.ok) return { error: changeErrorForStatus(catalog.status), ok: false }
        if (!catalog.value.nameById.has(input.medicalSpecialtyId)) {
          return { error: "not-found", ok: false }
        }

        const assignmentParsed = doctorSpecialtyListSchema.safeParse(assignmentResponse.value)
        const currentAssignment = assignmentParsed.success ? assignmentParsed.data.docs[0] : undefined
        if (!currentAssignment || relationshipId(currentAssignment.doctor) !== doctorId) {
          return { error: "not-found", ok: false }
        }

        const endpoint = endpointFor(`/api/doctorspecialties/${encodeURIComponent(assignmentId)}`)
        endpoint.searchParams.set("depth", "1")
        const response = await requestPayloadJson(
          endpoint,
          mutationInit(accessToken, "PATCH", {
            medicalSpecialty: input.medicalSpecialtyId,
            specializationLevel: input.specializationLevel,
          }),
          fetcher,
        )
        if (!response.ok) return { error: changeErrorForStatus(response.status), ok: false }

        const parsed = doctorSpecialtyResponseSchema.safeParse(response.value)
        if (!parsed.success) return { error: "invalid-data", ok: false }
        const assignment = rawDocument(parsed.data)
        if (relationshipId(assignment.doctor) !== doctorId) {
          return { error: "invalid-data", ok: false }
        }
        return { ok: true, value: mapDoctorSpecialty(assignment, catalog.value.nameById) }
      } catch {
        return { error: "temporarily-unavailable", ok: false }
      }
    },
  }
}
