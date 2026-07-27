import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  handleDoctorCreate,
  handleDoctorImageReplace,
  handleDoctorSpecialtyCreate,
  handleDoctorUpdate,
} from "@/features/clinic-dashboard/clinic-profile/server/public"
import type { DoctorProfileProviderFactory } from "@/features/clinic-dashboard/clinic-profile/server/doctor-profile-provider"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const providerMocks = vi.hoisted(() => ({
  createDoctor: vi.fn(),
  createSpecialty: vi.fn(),
  loadDirectory: vi.fn(),
  replaceImage: vi.fn(),
  updateDoctor: vi.fn(),
  updateSpecialty: vi.fn(),
}))

const createProvider = vi.fn((_: string, __: string) => providerMocks) satisfies DoctorProfileProviderFactory

const doctor = {
  active: false,
  biography: "Doctor biography.",
  experienceYears: 8,
  firstName: "Amelia",
  gender: "female",
  id: "doctor-1",
  languages: ["english"],
  lastName: "Carter",
  qualifications: ["MD"],
  specialties: [],
  title: "dr",
} as const

function jsonRequest(pathname: string, body: unknown, method: "PATCH" | "POST" = "POST") {
  const url = `http://localhost:3000${pathname}`
  const baseRequest = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method,
  })
  const token = createCsrfToken(baseRequest)

  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: `clinic_dashboard_csrf=${token}; clinic_dashboard_controlled_session=controlled-clinic-staff`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method,
  })
}

function pngBytes(size = 8) {
  const bytes = new Uint8Array(size)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return bytes
}

function imageRequest(mimeType = "image/png", bytes = pngBytes()) {
  const url = "http://localhost:3000/api/dashboard/doctors/doctor-1/image"
  const base = new NextRequest(url, {
    body: new FormData(),
    headers: { origin: "http://localhost:3000" },
    method: "POST",
  })
  const token = createCsrfToken(base)
  const formData = new FormData()
  formData.set("alt", "Portrait of Dr Amelia Carter")
  formData.set("file", new File([bytes], "amelia.png", { type: mimeType }))

  return new NextRequest(url, {
    body: formData,
    headers: {
      cookie: `clinic_dashboard_csrf=${token}; clinic_dashboard_controlled_session=controlled-clinic-staff`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method: "POST",
  })
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("vary")).toBe("Cookie")
}

describe("Doctor profile mutations", () => {
  beforeEach(() => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    providerMocks.createDoctor.mockResolvedValue({ ok: true, value: doctor })
    providerMocks.createSpecialty.mockResolvedValue({
      ok: true,
      value: {
        id: "assignment-1",
        medicalSpecialtyId: "specialty-1",
        medicalSpecialtyName: "Cardiology",
        specializationLevel: "specialist",
      },
    })
    providerMocks.replaceImage.mockResolvedValue({
      ok: true,
      value: {
        cleanupPending: false,
        profile: {
          ...doctor,
          image: {
            alt: "Portrait of Dr Amelia Carter",
            id: "image-1",
            url: "https://preview.findmydoc.eu/image.png",
          },
        },
      },
    })
    providerMocks.updateDoctor.mockResolvedValue({ ok: true, value: { ...doctor, active: true } })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("creates a doctor through the request-scoped clinic provider", async () => {
    const response = await handleDoctorCreate(
      jsonRequest("/api/dashboard/doctors", {
        biography: "Doctor biography.",
        experienceYears: 8,
        firstName: "Amelia",
        gender: "female",
        languages: ["english"],
        lastName: "Carter",
        qualifications: ["MD"],
        title: "dr",
      }),
      createProvider,
    )

    expect(response.status).toBe(201)
    expect(createProvider).toHaveBeenCalledWith("controlled-access-token", "controlled-clinic")
    expect(providerMocks.createDoctor).toHaveBeenCalledWith({
      biography: "Doctor biography.",
      experienceYears: 8,
      firstName: "Amelia",
      gender: "female",
      languages: ["english"],
      lastName: "Carter",
      qualifications: ["MD"],
      title: "dr",
    })
    expectPrivate(response)
  })

  it("updates active state and an existing specialty without exposing clinic identity", async () => {
    const updateResponse = await handleDoctorUpdate(
      jsonRequest("/api/dashboard/doctors/doctor-1", { active: true }, "PATCH"),
      "doctor-1",
      createProvider,
    )
    expect(updateResponse.status).toBe(200)
    expect(providerMocks.updateDoctor).toHaveBeenCalledWith("doctor-1", { active: true })

    const specialtyResponse = await handleDoctorSpecialtyCreate(
      jsonRequest("/api/dashboard/doctors/doctor-1/specialties", {
        medicalSpecialtyId: "specialty-1",
        specializationLevel: "specialist",
      }),
      "doctor-1",
      createProvider,
    )
    expect(specialtyResponse.status).toBe(201)
    expect(providerMocks.createSpecialty).toHaveBeenCalledWith("doctor-1", {
      medicalSpecialtyId: "specialty-1",
      specializationLevel: "specialist",
    })
  })

  it("validates image type and delegates an accepted exact upload", async () => {
    const response = await handleDoctorImageReplace(imageRequest(), "doctor-1", createProvider)
    expect(response.status).toBe(200)
    expect(providerMocks.replaceImage).toHaveBeenCalledWith(
      "doctor-1",
      expect.objectContaining({
        alt: "Portrait of Dr Amelia Carter",
        fileName: "amelia.png",
        mimeType: "image/png",
      }),
    )

    const unsupported = await handleDoctorImageReplace(imageRequest("text/plain"), "doctor-1", createProvider)
    expect(unsupported.status).toBe(415)
    await expect(unsupported.json()).resolves.toEqual({ code: "DOCTOR_IMAGE_UNSUPPORTED" })

    const svg = await handleDoctorImageReplace(
      imageRequest("image/svg+xml", new TextEncoder().encode("<svg><script /></svg>")),
      "doctor-1",
      createProvider,
    )
    expect(svg.status).toBe(415)

    const spoofed = await handleDoctorImageReplace(
      imageRequest("image/png", new TextEncoder().encode("<svg><script /></svg>")),
      "doctor-1",
      createProvider,
    )
    expect(spoofed.status).toBe(415)

    const exactLimit = await handleDoctorImageReplace(
      imageRequest("image/png", pngBytes(4 * 1024 * 1024)),
      "doctor-1",
      createProvider,
    )
    expect(exactLimit.status).toBe(200)

    const tooLarge = await handleDoctorImageReplace(
      imageRequest("image/png", pngBytes(4 * 1024 * 1024 + 1)),
      "doctor-1",
      createProvider,
    )
    expect(tooLarge.status).toBe(413)
    await expect(tooLarge.json()).resolves.toEqual({ code: "DOCTOR_IMAGE_TOO_LARGE" })
  })

  it("rejects invalid data before provider composition and maps conflicts", async () => {
    const invalid = await handleDoctorCreate(
      jsonRequest("/api/dashboard/doctors", {
        experienceYears: -1,
        firstName: "Amelia",
        gender: "female",
        languages: ["english"],
        lastName: "Carter",
        qualifications: ["MD"],
      }),
      createProvider,
    )
    expect(invalid.status).toBe(400)
    expect(createProvider).not.toHaveBeenCalled()

    providerMocks.updateDoctor.mockResolvedValueOnce({ error: "conflict", ok: false })
    const conflict = await handleDoctorUpdate(
      jsonRequest("/api/dashboard/doctors/doctor-1", { active: true }, "PATCH"),
      "doctor-1",
      createProvider,
    )
    expect(conflict.status).toBe(409)
    await expect(conflict.json()).resolves.toEqual({ code: "DOCTOR_CONFLICT" })
  })
})
