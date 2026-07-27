import { beforeEach, describe, expect, it } from "vitest"
import {
  createControlledDoctorProfileProvider,
  resetControlledDoctorProfileProvider,
} from "@/features/clinic-dashboard/clinic-profile/server/controlled-doctor-profiles"

describe("Controlled doctor profile provider", () => {
  beforeEach(() => resetControlledDoctorProfileProvider())

  it("supports the complete doctor and specialty mutation contract", async () => {
    const provider = createControlledDoctorProfileProvider()
    const created = await provider.createDoctor({
      biography: "New doctor biography.",
      experienceYears: 0,
      firstName: "Jordan",
      gender: "female",
      languages: ["english"],
      lastName: "Lee",
      qualifications: ["MD"],
      title: "dr",
    })
    expect(created).toMatchObject({
      ok: true,
      value: {
        active: false,
        firstName: "Jordan",
      },
    })
    if (!created.ok) throw new Error("Expected a created doctor")

    const assignment = await provider.createSpecialty(created.value.id, {
      medicalSpecialtyId: "specialty-cardiology",
      specializationLevel: "beginner",
    })
    expect(assignment).toMatchObject({
      ok: true,
      value: {
        medicalSpecialtyName: "Cardiology",
        specializationLevel: "beginner",
      },
    })
    if (!assignment.ok) throw new Error("Expected a created specialty")

    await expect(
      provider.createSpecialty(created.value.id, {
        medicalSpecialtyId: "specialty-cardiology",
        specializationLevel: "expert",
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })

    await expect(
      provider.updateSpecialty(created.value.id, assignment.value.id, {
        medicalSpecialtyId: "specialty-interventional-cardiology",
        specializationLevel: "specialist",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        medicalSpecialtyName: "Interventional Cardiology",
        specializationLevel: "specialist",
      },
    })

    await expect(provider.updateDoctor(created.value.id, { active: true })).resolves.toMatchObject({
      ok: true,
      value: { active: true },
    })
    await expect(
      provider.replaceImage(created.value.id, {
        alt: "Portrait of Dr Jordan Lee",
        bytes: new Uint8Array([1, 2, 3]),
        fileName: "jordan-lee.png",
        mimeType: "image/png",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        cleanupPending: false,
        profile: {
          image: { alt: "Portrait of Dr Jordan Lee" },
        },
      },
    })

    await expect(provider.loadDirectory()).resolves.toMatchObject({
      ok: true,
      value: {
        doctors: [
          { id: "controlled-doctor-1" },
          {
            active: true,
            firstName: "Jordan",
            specialties: [
              {
                medicalSpecialtyId: "specialty-interventional-cardiology",
              },
            ],
          },
        ],
        status: "ready",
      },
    })
  })
})
