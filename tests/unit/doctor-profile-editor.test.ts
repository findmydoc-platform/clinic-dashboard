import { describe, expect, it, vi } from "vitest"
import {
  createDoctorProfileDraft,
  getDoctorProfileDraftError,
  getDoctorProfileDraftErrors,
  saveDoctorProfileDraft,
} from "@/features/clinic-dashboard/clinic-profile/model/doctor-profile-editor"
import type {
  DoctorProfile,
  DoctorSpecialtyAssignment,
} from "@/features/clinic-dashboard/clinic-profile/model/doctor-profile"
import {
  DoctorProfileCommandError,
  type DoctorProfileCommands,
} from "@/features/clinic-dashboard/clinic-profile/model/doctor-profile-commands"

const inactiveDoctor = {
  active: false,
  firstName: "Amelia",
  gender: "female",
  id: "doctor-1",
  languages: ["english"],
  lastName: "Carter",
  qualifications: ["MD"],
  specialties: [],
} as const satisfies DoctorProfile

const cardiologyAssignment = {
  id: "assignment-1",
  medicalSpecialtyId: "specialty-cardiology",
  medicalSpecialtyName: "Cardiology",
  specializationLevel: "specialist",
} as const satisfies DoctorSpecialtyAssignment

function commandFixture(overrides: Partial<DoctorProfileCommands> = {}): DoctorProfileCommands {
  return {
    createDoctor: vi.fn(async () => inactiveDoctor),
    createSpecialty: vi.fn(async () => cardiologyAssignment),
    replaceImage: vi.fn(async () => ({
      cleanupPending: false,
      profile: {
        ...inactiveDoctor,
        image: { alt: "Portrait", id: "image-1" },
      },
    })),
    updateDoctor: vi.fn(async (_doctorId, input) => ({ ...inactiveDoctor, ...input })),
    updateSpecialty: vi.fn(async () => cardiologyAssignment),
    ...overrides,
  }
}

function validNewDraft() {
  return {
    ...createDoctorProfileDraft(),
    firstName: "Amelia",
    gender: "female" as const,
    imageFile: new File(["portrait"], "portrait.png", { type: "image/png" }),
    languages: ["english"] as const,
    lastName: "Carter",
    qualifications: "MD",
    specialties: [
      {
        clientId: "specialty-row-1",
        medicalSpecialtyId: "specialty-cardiology",
        specializationLevel: "specialist" as const,
      },
    ],
  }
}

describe("doctor profile editor", () => {
  it("creates inactive, saves follow-up records, and activates only at the end", async () => {
    const calls: string[] = []
    const commands = commandFixture({
      createDoctor: vi.fn(async () => {
        calls.push("create")
        return inactiveDoctor
      }),
      createSpecialty: vi.fn(async () => {
        calls.push("specialty")
        return cardiologyAssignment
      }),
      replaceImage: vi.fn(async () => {
        calls.push("image")
        return {
          cleanupPending: false,
          profile: {
            ...inactiveDoctor,
            image: { alt: "Portrait", id: "image-1" },
          },
        }
      }),
      updateDoctor: vi.fn(async (_doctorId, input) => {
        calls.push("activate")
        return { ...inactiveDoctor, ...input }
      }),
    })

    const result = await saveDoctorProfileDraft(commands, validNewDraft())

    expect(result.status).toBe("saved")
    expect(result.doctor).toMatchObject({
      active: true,
      image: { id: "image-1" },
      specialties: [{ id: "assignment-1" }],
    })
    expect(calls[0]).toBe("create")
    expect(calls.at(-1)).toBe("activate")
    expect(calls.slice(1, -1).sort()).toEqual(["image", "specialty"])
  })

  it("keeps only failed follow-up inputs pending and activates after a successful retry", async () => {
    const updateDoctor = vi.fn(async () => ({ ...inactiveDoctor, active: true }))
    const dermatologyAssignment = {
      id: "assignment-2",
      medicalSpecialtyId: "specialty-dermatology",
      medicalSpecialtyName: "Dermatology",
      specializationLevel: "advanced",
    } as const satisfies DoctorSpecialtyAssignment
    const createSpecialty = vi
      .fn<DoctorProfileCommands["createSpecialty"]>()
      .mockResolvedValueOnce(cardiologyAssignment)
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce(dermatologyAssignment)
    const commands = commandFixture({
      createSpecialty,
      updateDoctor,
    })
    const draft = {
      ...validNewDraft(),
      specialties: [
        ...validNewDraft().specialties,
        {
          clientId: "specialty-row-2",
          medicalSpecialtyId: "specialty-dermatology",
          specializationLevel: "advanced" as const,
        },
      ],
    }

    const result = await saveDoctorProfileDraft(commands, draft)

    expect(result.status).toBe("partial")
    expect(result.doctor).toMatchObject({
      active: false,
      image: { id: "image-1" },
      specialties: [{ id: "assignment-1" }],
    })
    expect(result.draft.doctorId).toBe("doctor-1")
    expect(result.draft.imageFile).toBeUndefined()
    expect(result.draft.specialties[0]?.assignmentId).toBe("assignment-1")
    expect(result.draft.specialties[1]?.assignmentId).toBeUndefined()
    expect(result.failedSteps).toEqual([{ clientId: "specialty-row-2", kind: "specialty" }])
    expect(updateDoctor).not.toHaveBeenCalled()

    const retryResult = await saveDoctorProfileDraft(commands, result.draft, result.doctor)

    expect(retryResult.status).toBe("saved")
    expect(retryResult.doctor).toMatchObject({
      active: true,
      specialties: [{ id: "assignment-1" }, { id: "assignment-2" }],
    })
    expect(retryResult.draft.activationPending).toBe(false)
    expect(createSpecialty).toHaveBeenCalledTimes(3)
    expect(updateDoctor).toHaveBeenCalledOnce()
    expect(updateDoctor).toHaveBeenCalledWith("doctor-1", { active: true })
  })

  it("attempts independent edit operations even when the base update fails", async () => {
    const updateSpecialty = vi.fn(async () => ({
      ...cardiologyAssignment,
      specializationLevel: "expert" as const,
    }))
    const replaceImage = vi
      .fn<DoctorProfileCommands["replaceImage"]>()
      .mockRejectedValueOnce(new Error("image unavailable"))
      .mockResolvedValueOnce({
        cleanupPending: false,
        profile: {
          ...inactiveDoctor,
          image: { alt: "Portrait", id: "image-1" },
        },
      })
    const updateDoctor = vi
      .fn<DoctorProfileCommands["updateDoctor"]>()
      .mockRejectedValueOnce(new Error("profile unavailable"))
      .mockImplementation(async (_doctorId, input) => ({
        ...inactiveDoctor,
        ...input,
        biography: input.biography ?? undefined,
        experienceYears: input.experienceYears ?? undefined,
        title: input.title ?? undefined,
      }))
    const commands = commandFixture({
      replaceImage,
      updateDoctor,
      updateSpecialty,
    })
    const draft = {
      ...createDoctorProfileDraft({
        ...inactiveDoctor,
        specialties: [cardiologyAssignment],
      }),
      biography: "Updated biography",
      imageFile: new File(["portrait"], "portrait.png", { type: "image/png" }),
      specialties: [
        {
          assignmentId: "assignment-1",
          clientId: "assignment-1",
          medicalSpecialtyId: "specialty-cardiology",
          specializationLevel: "expert" as const,
        },
      ],
    }

    const result = await saveDoctorProfileDraft(commands, draft, {
      ...inactiveDoctor,
      specialties: [cardiologyAssignment],
    })

    expect(result.status).toBe("partial")
    expect(updateSpecialty).toHaveBeenCalledOnce()
    expect(replaceImage).toHaveBeenCalledOnce()
    expect(result.failedSteps).toEqual([{ kind: "profile" }, { kind: "image" }])
    expect(result.doctor?.specialties[0]?.specializationLevel).toBe("expert")
    expect(result.draft.imageFile).toBe(draft.imageFile)

    const retryResult = await saveDoctorProfileDraft(commands, result.draft, result.doctor)

    expect(retryResult.status).toBe("saved")
    expect(retryResult.doctor).toMatchObject({
      biography: "Updated biography",
      image: { id: "image-1" },
      specialties: [{ id: "assignment-1", specializationLevel: "expert" }],
    })
    expect(updateDoctor).toHaveBeenCalledTimes(2)
    expect(replaceImage).toHaveBeenCalledTimes(2)
    expect(updateSpecialty).toHaveBeenCalledOnce()
  })

  it("defers activation of an existing inactive doctor until follow-up changes succeed", async () => {
    const replaceImage = vi
      .fn<DoctorProfileCommands["replaceImage"]>()
      .mockRejectedValueOnce(new Error("image unavailable"))
      .mockResolvedValueOnce({
        cleanupPending: false,
        profile: {
          ...inactiveDoctor,
          image: { alt: "Portrait", id: "image-1" },
        },
      })
    let storedDoctor: DoctorProfile = inactiveDoctor
    const updateDoctor = vi.fn<DoctorProfileCommands["updateDoctor"]>(async (_doctorId, input) => {
      const updatedDoctor = { ...storedDoctor, ...input }
      storedDoctor = {
        ...updatedDoctor,
        biography: updatedDoctor.biography ?? undefined,
        experienceYears: updatedDoctor.experienceYears ?? undefined,
        title: updatedDoctor.title ?? undefined,
      }
      return storedDoctor
    })
    const commands = commandFixture({ replaceImage, updateDoctor })
    const draft = {
      ...createDoctorProfileDraft(inactiveDoctor),
      active: true,
      biography: "Ready for publication.",
      imageFile: new File(["portrait"], "portrait.png", { type: "image/png" }),
    }

    const firstResult = await saveDoctorProfileDraft(commands, draft, inactiveDoctor)

    expect(firstResult.status).toBe("partial")
    expect(firstResult.doctor?.active).toBe(false)
    expect(firstResult.draft.activationPending).toBe(true)
    expect(updateDoctor).toHaveBeenCalledOnce()
    expect(updateDoctor).toHaveBeenCalledWith(
      "doctor-1",
      expect.objectContaining({ active: false, biography: "Ready for publication." }),
    )

    const retryResult = await saveDoctorProfileDraft(commands, firstResult.draft, firstResult.doctor)

    expect(retryResult.status).toBe("saved")
    expect(retryResult.doctor?.active).toBe(true)
    expect(replaceImage).toHaveBeenCalledTimes(2)
    expect(updateDoctor).toHaveBeenCalledTimes(2)
    expect(updateDoctor).toHaveBeenLastCalledWith("doctor-1", { active: true })
  })

  it("blocks duplicate specialty assignments", () => {
    const specialty = validNewDraft().specialties[0]
    if (!specialty) throw new Error("A specialty draft is required.")

    expect(
      getDoctorProfileDraftError({
        ...validNewDraft(),
        specialties: [specialty, { ...specialty, clientId: "duplicate" }],
      }),
    ).toBe("Each specialty can only be assigned once.")
  })

  it("does not repeat a doctor create after an uncertain failure", async () => {
    const createDoctor = vi.fn(async () => {
      throw new Error("response lost")
    })
    const commands = commandFixture({ createDoctor })

    const firstResult = await saveDoctorProfileDraft(commands, validNewDraft())
    const retryResult = await saveDoctorProfileDraft(commands, firstResult.draft)

    expect(firstResult).toMatchObject({
      draft: { creationStatus: "unknown" },
      failedSteps: [{ kind: "profile-uncertain" }],
      status: "failed",
    })
    expect(retryResult.failedSteps).toEqual([{ kind: "profile-uncertain" }])
    expect(createDoctor).toHaveBeenCalledOnce()
  })

  it("allows retrying a doctor create after a definitive rejection", async () => {
    const createDoctor = vi
      .fn<DoctorProfileCommands["createDoctor"]>()
      .mockRejectedValueOnce(new DoctorProfileCommandError("rejected", "Invalid doctor profile."))
      .mockResolvedValueOnce(inactiveDoctor)
    const commands = commandFixture({ createDoctor })

    const firstResult = await saveDoctorProfileDraft(commands, validNewDraft())
    const retryResult = await saveDoctorProfileDraft(commands, firstResult.draft)

    expect(firstResult).toMatchObject({
      draft: { creationStatus: "ready" },
      failedSteps: [{ kind: "profile" }],
      status: "failed",
    })
    expect(retryResult.status).toBe("saved")
    expect(createDoctor).toHaveBeenCalledTimes(2)
  })

  it("reports image cleanup as a partial result without retrying the upload", async () => {
    const replaceImage = vi.fn(async () => ({
      cleanupPending: true,
      profile: {
        ...inactiveDoctor,
        image: { alt: "Portrait", id: "image-1" },
      },
    }))
    const draft = {
      ...createDoctorProfileDraft(inactiveDoctor),
      imageFile: new File(["portrait"], "portrait.png", { type: "image/png" }),
    }

    const result = await saveDoctorProfileDraft(commandFixture({ replaceImage }), draft, inactiveDoctor)

    expect(result.status).toBe("partial")
    expect(result.failedSteps).toEqual([{ kind: "image-cleanup" }])
    expect(result.draft.imageFile).toBeUndefined()
    expect(result.doctor?.image?.id).toBe("image-1")
  })

  it("mirrors the BFF limits in field-level validation", () => {
    expect(
      getDoctorProfileDraftErrors({
        ...validNewDraft(),
        firstName: "A".repeat(121),
        qualifications: Array.from({ length: 31 }, (_, index) => `Qualification ${index}`).join("\n"),
      }),
    ).toMatchObject({
      firstName: "First name must be 120 characters or fewer.",
      qualifications: "Enter no more than 30 qualifications.",
    })
  })

  it("returns field-level errors for an incomplete draft", () => {
    expect(
      getDoctorProfileDraftErrors({
        ...createDoctorProfileDraft(),
        specialties: [
          {
            clientId: "pending-specialty",
            medicalSpecialtyId: "",
            specializationLevel: "",
          },
        ],
      }),
    ).toEqual({
      firstName: "Enter a first name.",
      gender: "Select a gender.",
      languages: "Select at least one language.",
      lastName: "Enter a last name.",
      qualifications: "Enter at least one qualification.",
      specialties: "Select a specialty for every added row.",
    })
  })
})
