import "server-only"

import type {
  DoctorProfile,
  DoctorSpecialtyAssignment,
  MedicalSpecialtyOption,
} from "../model/doctor-profile"
import type { DoctorProfileProvider } from "./doctor-profile-provider"

const controlledMedicalSpecialties = [
  { id: "specialty-cardiology", name: "Cardiology" },
  {
    id: "specialty-interventional-cardiology",
    name: "Interventional Cardiology",
    parentSpecialtyId: "specialty-cardiology",
    parentSpecialtyName: "Cardiology",
  },
  { id: "specialty-dermatology", name: "Dermatology" },
] as const satisfies readonly MedicalSpecialtyOption[]

const initialControlledDoctors = [
  {
    active: true,
    biography: "Cardiologist focused on clear, patient-centred treatment planning.",
    experienceYears: 12,
    firstName: "Amelia",
    gender: "female",
    id: "controlled-doctor-1",
    languages: ["english", "german"],
    lastName: "Carter",
    qualifications: ["MD", "FESC"],
    specialties: [
      {
        id: "controlled-doctor-specialty-1",
        medicalSpecialtyId: "specialty-cardiology",
        medicalSpecialtyName: "Cardiology",
        specializationLevel: "specialist",
      },
    ],
    title: "dr",
  },
] as const satisfies readonly DoctorProfile[]

let doctors: DoctorProfile[] = initialControlledDoctors.map(cloneDoctor)
let doctorSequence = 1
let specialtySequence = 1
let imageSequence = 0

function cloneSpecialty(specialty: DoctorSpecialtyAssignment): DoctorSpecialtyAssignment {
  return { ...specialty }
}

function cloneDoctor(doctor: DoctorProfile): DoctorProfile {
  return {
    ...doctor,
    languages: [...doctor.languages],
    qualifications: [...doctor.qualifications],
    specialties: doctor.specialties.map(cloneSpecialty),
  }
}

function findSpecialty(medicalSpecialtyId: string) {
  return controlledMedicalSpecialties.find((specialty) => specialty.id === medicalSpecialtyId)
}

function sortDoctors(left: DoctorProfile, right: DoctorProfile) {
  return (
    left.lastName.localeCompare(right.lastName, "en") || left.firstName.localeCompare(right.firstName, "en")
  )
}

export function resetControlledDoctorProfileProvider() {
  doctors = initialControlledDoctors.map(cloneDoctor)
  doctorSequence = 1
  specialtySequence = 1
  imageSequence = 0
}

export function createControlledDoctorProfileProvider(): DoctorProfileProvider {
  return {
    async createDoctor(input) {
      doctorSequence += 1
      const doctor = {
        ...input,
        active: false,
        id: `controlled-doctor-${doctorSequence}`,
        languages: [...input.languages],
        qualifications: [...input.qualifications],
        specialties: [],
      } satisfies DoctorProfile
      doctors = [...doctors, doctor]
      return { ok: true, value: cloneDoctor(doctor) }
    },
    async createSpecialty(doctorId, input) {
      const doctor = doctors.find((candidate) => candidate.id === doctorId)
      const specialty = findSpecialty(input.medicalSpecialtyId)
      if (!doctor || !specialty) return { error: "not-found", ok: false }
      if (
        doctor.specialties.some((assignment) => assignment.medicalSpecialtyId === input.medicalSpecialtyId)
      ) {
        return { error: "conflict", ok: false }
      }

      specialtySequence += 1
      const assignment = {
        id: `controlled-doctor-specialty-${specialtySequence}`,
        medicalSpecialtyId: specialty.id,
        medicalSpecialtyName: specialty.name,
        specializationLevel: input.specializationLevel,
      } satisfies DoctorSpecialtyAssignment
      doctors = doctors.map((candidate) =>
        candidate.id === doctorId
          ? { ...candidate, specialties: [...candidate.specialties, assignment] }
          : candidate,
      )
      return { ok: true, value: assignment }
    },
    async loadDirectory() {
      return {
        ok: true,
        value: {
          doctors: doctors.map(cloneDoctor).sort(sortDoctors),
          medicalSpecialties: controlledMedicalSpecialties.map((specialty) => ({ ...specialty })),
          status: "ready",
        },
      }
    },
    async replaceImage(doctorId, input) {
      const doctor = doctors.find((candidate) => candidate.id === doctorId)
      if (!doctor) return { error: "not-found", ok: false }

      imageSequence += 1
      const updated = {
        ...doctor,
        image: {
          alt: input.alt,
          id: `controlled-doctor-image-${imageSequence}`,
        },
      } satisfies DoctorProfile
      doctors = doctors.map((candidate) => (candidate.id === doctorId ? updated : candidate))
      return {
        ok: true,
        value: {
          cleanupPending: false,
          profile: cloneDoctor(updated),
        },
      }
    },
    async updateDoctor(doctorId, input) {
      const doctor = doctors.find((candidate) => candidate.id === doctorId)
      if (!doctor) return { error: "not-found", ok: false }

      const { biography, experienceYears, title, ...fields } = input
      const updated = {
        ...doctor,
        ...fields,
        biography: biography === null ? undefined : (biography ?? doctor.biography),
        experienceYears: experienceYears === null ? undefined : (experienceYears ?? doctor.experienceYears),
        languages: input.languages ? [...input.languages] : doctor.languages,
        qualifications: input.qualifications ? [...input.qualifications] : doctor.qualifications,
        title: title === null ? undefined : (title ?? doctor.title),
      } satisfies DoctorProfile
      doctors = doctors.map((candidate) => (candidate.id === doctorId ? updated : candidate))
      return { ok: true, value: cloneDoctor(updated) }
    },
    async updateSpecialty(doctorId, assignmentId, input) {
      const doctor = doctors.find((candidate) => candidate.id === doctorId)
      const specialty = findSpecialty(input.medicalSpecialtyId)
      const assignment = doctor?.specialties.find((candidate) => candidate.id === assignmentId)
      if (!doctor || !specialty || !assignment) return { error: "not-found", ok: false }
      if (
        doctor.specialties.some(
          (candidate) =>
            candidate.id !== assignmentId && candidate.medicalSpecialtyId === input.medicalSpecialtyId,
        )
      ) {
        return { error: "conflict", ok: false }
      }

      const updatedAssignment = {
        ...assignment,
        medicalSpecialtyId: specialty.id,
        medicalSpecialtyName: specialty.name,
        specializationLevel: input.specializationLevel,
      } satisfies DoctorSpecialtyAssignment
      doctors = doctors.map((candidate) =>
        candidate.id === doctorId
          ? {
              ...candidate,
              specialties: candidate.specialties.map((specialtyAssignment) =>
                specialtyAssignment.id === assignmentId ? updatedAssignment : specialtyAssignment,
              ),
            }
          : candidate,
      )
      return { ok: true, value: updatedAssignment }
    },
  }
}
