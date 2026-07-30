"use client"

import { z } from "zod"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import {
  doctorGenderValues,
  doctorLanguageValues,
  doctorSpecializationLevelValues,
  doctorTitleValues,
} from "../model/doctor-profile"
import { DoctorProfileCommandError, type DoctorProfileCommands } from "../model/doctor-profile-commands"

const doctorSpecialtySchema = z.object({
  id: z.string(),
  medicalSpecialtyId: z.string(),
  medicalSpecialtyName: z.string(),
  specializationLevel: z.enum(doctorSpecializationLevelValues),
})
const doctorProfileSchema = z.object({
  active: z.boolean(),
  biography: z.string().optional(),
  experienceYears: z.number().int().nonnegative().optional(),
  firstName: z.string(),
  gender: z.enum(doctorGenderValues),
  id: z.string(),
  image: z
    .object({
      alt: z.string(),
      id: z.string(),
      url: z.string().optional(),
    })
    .optional(),
  languages: z.array(z.enum(doctorLanguageValues)),
  lastName: z.string(),
  qualifications: z.array(z.string()),
  specialties: z.array(doctorSpecialtySchema),
  title: z.enum(doctorTitleValues).optional(),
})
const doctorImageReplaceSchema = z.object({
  cleanupPending: z.boolean(),
  profile: doctorProfileSchema,
})

async function submitJson(endpoint: string, method: "PATCH" | "POST", body: unknown) {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) throw new DoctorProfileCommandError("rejected", "Missing request verification.")

  let response: Response
  try {
    response = await fetch(endpoint, {
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
      },
      method,
      redirect: "error",
    })
  } catch {
    throw new DoctorProfileCommandError("unknown", "Doctor profile update outcome is unknown.")
  }
  if (!response.ok) {
    throw new DoctorProfileCommandError("rejected", "Doctor profile update failed.")
  }

  return response.json().catch(() => null)
}

export function createDoctorProfileApiCommands(): DoctorProfileCommands {
  return {
    async createDoctor(input) {
      const parsed = doctorProfileSchema.safeParse(await submitJson("/api/dashboard/doctors", "POST", input))
      if (!parsed.success) {
        throw new DoctorProfileCommandError("unknown", "Doctor profile response was invalid.")
      }
      return parsed.data
    },
    async createSpecialty(doctorId, input) {
      const parsed = doctorSpecialtySchema.safeParse(
        await submitJson(`/api/dashboard/doctors/${encodeURIComponent(doctorId)}/specialties`, "POST", input),
      )
      if (!parsed.success) throw new Error("Doctor specialty response was invalid.")
      return parsed.data
    },
    async replaceImage(doctorId, input) {
      const csrfToken = readBrowserCsrfToken(document.cookie)
      if (!csrfToken) throw new DoctorProfileCommandError("rejected", "Missing request verification.")

      const body = new FormData()
      body.set("alt", input.alt)
      body.set("file", input.file)
      let response: Response
      try {
        response = await fetch(`/api/dashboard/doctors/${encodeURIComponent(doctorId)}/image`, {
          body,
          credentials: "same-origin",
          headers: { [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken },
          method: "POST",
          redirect: "error",
        })
      } catch {
        throw new DoctorProfileCommandError("unknown", "Doctor image update outcome is unknown.")
      }
      if (!response.ok) {
        throw new DoctorProfileCommandError("rejected", "Doctor image update failed.")
      }

      const parsed = doctorImageReplaceSchema.safeParse(await response.json().catch(() => null))
      if (!parsed.success) {
        throw new DoctorProfileCommandError("unknown", "Doctor profile response was invalid.")
      }
      return parsed.data
    },
    async updateDoctor(doctorId, input) {
      const parsed = doctorProfileSchema.safeParse(
        await submitJson(`/api/dashboard/doctors/${encodeURIComponent(doctorId)}`, "PATCH", input),
      )
      if (!parsed.success) throw new Error("Doctor profile response was invalid.")
      return parsed.data
    },
    async updateSpecialty(doctorId, assignmentId, input) {
      const parsed = doctorSpecialtySchema.safeParse(
        await submitJson(
          `/api/dashboard/doctors/${encodeURIComponent(doctorId)}/specialties/${encodeURIComponent(assignmentId)}`,
          "PATCH",
          input,
        ),
      )
      if (!parsed.success) throw new Error("Doctor specialty response was invalid.")
      return parsed.data
    },
  }
}
