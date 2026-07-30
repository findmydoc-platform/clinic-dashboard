import sarahSchmidtAvatar from "@/assets/clinic-dashboard/sarah-schmidt.jpg"
import type {
  DoctorDirectoryReadySnapshot,
  DoctorProfile,
  DoctorSpecialtyAssignment,
} from "../model/doctor-profile"
import type { DoctorProfileCommands } from "../model/doctor-profile-commands"

export const doctorDirectoryFixture = {
  doctors: [
    {
      active: true,
      biography:
        "Dr. Sarah Schmidt is a board-certified dermatologist with over 12 years of clinical experience. She specializes in medical and cosmetic dermatology, with a focus on skin health, dermatologic surgery and laser treatments. Her approach combines evidence-based medicine with patient-centered care to achieve natural and lasting results.",
      experienceYears: 12,
      firstName: "Sarah",
      gender: "female",
      id: "doctor-sarah-schmidt",
      image: {
        alt: "Portrait of Dr Sarah Schmidt",
        id: "media-sarah-schmidt",
        url: sarahSchmidtAvatar.src,
      },
      languages: ["german", "english"],
      lastName: "Schmidt",
      qualifications: ["MD – Doctor of Medicine", "Specialist in Dermatology"],
      specialties: [
        {
          id: "assignment-sarah-dermatology",
          medicalSpecialtyId: "specialty-dermatology",
          medicalSpecialtyName: "Dermatology",
          specializationLevel: "specialist",
        },
        {
          id: "assignment-sarah-laser-medicine",
          medicalSpecialtyId: "specialty-laser-medicine",
          medicalSpecialtyName: "Laser Medicine",
          specializationLevel: "specialist",
        },
      ],
      title: "dr",
    },
    {
      active: false,
      firstName: "Noah",
      gender: "male",
      id: "doctor-noah-williams",
      languages: ["english"],
      lastName: "Williams",
      qualifications: ["MD"],
      specialties: [],
    },
  ],
  medicalSpecialties: [
    {
      id: "specialty-cardiology",
      name: "Cardiology",
    },
    {
      id: "specialty-interventional-cardiology",
      name: "Interventional Cardiology",
      parentSpecialtyId: "specialty-cardiology",
      parentSpecialtyName: "Cardiology",
    },
    {
      id: "specialty-dermatology",
      name: "Dermatology",
    },
    {
      id: "specialty-laser-medicine",
      name: "Laser Medicine",
    },
  ],
  status: "ready",
} as const satisfies DoctorDirectoryReadySnapshot

export function createDoctorProfileCommandsFixture(latencyMs = 0): DoctorProfileCommands {
  let doctorSequence = 0
  let specialtySequence = 0
  const wait = async () => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
  }
  const specialtyNameById = new Map<string, string>(
    doctorDirectoryFixture.medicalSpecialties.map(({ id, name }) => [id, name]),
  )

  return {
    async createDoctor(input) {
      await wait()
      doctorSequence += 1
      return {
        ...input,
        active: false,
        id: `doctor-fixture-${doctorSequence}`,
        specialties: [],
      } satisfies DoctorProfile
    },
    async createSpecialty(_doctorId, input) {
      await wait()
      specialtySequence += 1
      return {
        id: `assignment-fixture-${specialtySequence}`,
        medicalSpecialtyId: input.medicalSpecialtyId,
        medicalSpecialtyName: specialtyNameById.get(input.medicalSpecialtyId) ?? "Unknown specialty",
        specializationLevel: input.specializationLevel,
      } satisfies DoctorSpecialtyAssignment
    },
    async replaceImage(_doctorId, input) {
      await wait()
      return {
        cleanupPending: false,
        profile: {
          ...doctorDirectoryFixture.doctors[0],
          image: {
            alt: input.alt,
            id: "media-fixture",
          },
        },
      }
    },
    async updateDoctor(doctorId, input) {
      await wait()
      const existing: DoctorProfile =
        doctorDirectoryFixture.doctors.find(({ id }) => id === doctorId) ??
        ({
          active: false,
          firstName: "New",
          gender: "female",
          id: doctorId,
          languages: ["english"],
          lastName: "Doctor",
          qualifications: ["MD"],
          specialties: [],
        } satisfies DoctorProfile)
      return {
        ...existing,
        ...input,
        biography: input.biography === null ? undefined : (input.biography ?? existing.biography),
        experienceYears:
          input.experienceYears === null ? undefined : (input.experienceYears ?? existing.experienceYears),
        title: input.title === null ? undefined : (input.title ?? existing.title),
      } satisfies DoctorProfile
    },
    async updateSpecialty(_doctorId, assignmentId, input) {
      await wait()
      return {
        id: assignmentId,
        medicalSpecialtyId: input.medicalSpecialtyId,
        medicalSpecialtyName: specialtyNameById.get(input.medicalSpecialtyId) ?? "Unknown specialty",
        specializationLevel: input.specializationLevel,
      } satisfies DoctorSpecialtyAssignment
    },
  }
}
