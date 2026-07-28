import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPayloadDoctorProfileProvider } from "@/features/clinic-dashboard/clinic-profile/server/payload-doctor-profiles"

const upstreamDoctor = {
  active: true,
  biography: "Cardiology biography.\n\nSecond paragraph.",
  clinic: { id: "clinic-1", name: "Clinic One" },
  experienceYears: 12,
  firstName: "Amelia",
  gender: "female",
  id: "doctor-1",
  languages: ["english", "german"],
  lastName: "Carter",
  profileImage: {
    alt: "Portrait of Dr Amelia Carter",
    id: "media-old",
    url: "/api/doctorMedia/file/amelia-old.png",
  },
  qualifications: ["MD", "FESC"],
  title: "dr",
}

const upstreamSpecialties = [
  {
    id: "specialty-cardiology",
    name: "Cardiology",
    parentSpecialty: null,
  },
  {
    id: "specialty-interventional-cardiology",
    name: "Interventional Cardiology",
    parentSpecialty: { id: "specialty-cardiology", name: "Cardiology" },
  },
]

const upstreamAssignment = {
  doctor: { id: "doctor-1", firstName: "Amelia" },
  id: "assignment-1",
  medicalSpecialty: { id: "specialty-cardiology", name: "Cardiology" },
  specializationLevel: "specialist",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })
}

describe("Doctor profile Payload adapter", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("loads only the authenticated clinic directory and existing specialty catalogue", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors") return jsonResponse({ docs: [upstreamDoctor] })
      if (url.pathname === "/api/medical-specialties") {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorspecialties") {
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      return jsonResponse({}, 404)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(provider.loadDirectory()).resolves.toEqual({
      ok: true,
      value: {
        doctors: [
          {
            active: true,
            biography: "Cardiology biography.\n\nSecond paragraph.",
            experienceYears: 12,
            firstName: "Amelia",
            gender: "female",
            id: "doctor-1",
            image: {
              alt: "Portrait of Dr Amelia Carter",
              id: "media-old",
              url: "https://preview.findmydoc.eu/api/doctorMedia/file/amelia-old.png",
            },
            languages: ["english", "german"],
            lastName: "Carter",
            qualifications: ["MD", "FESC"],
            specialties: [
              {
                id: "assignment-1",
                medicalSpecialtyId: "specialty-cardiology",
                medicalSpecialtyName: "Cardiology",
                specializationLevel: "specialist",
              },
            ],
            title: "dr",
          },
        ],
        medicalSpecialties: [
          {
            id: "specialty-cardiology",
            name: "Cardiology",
            parentSpecialtyId: undefined,
            parentSpecialtyName: undefined,
          },
          {
            id: "specialty-interventional-cardiology",
            name: "Interventional Cardiology",
            parentSpecialtyId: "specialty-cardiology",
            parentSpecialtyName: "Cardiology",
          },
        ],
        status: "ready",
      },
    })

    const doctorRequest = fetcher.mock.calls.find(([input]) => String(input).includes("/api/doctors?"))
    const doctorUrl = new URL(String(doctorRequest?.[0]))
    expect(doctorUrl.searchParams.get("where[clinic][equals]")).toBe("clinic-1")
    expect(doctorRequest?.[1]).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
      },
    })
  })

  it("creates doctors inactive with the server-derived clinic identity", async () => {
    const numericDoctor = {
      ...upstreamDoctor,
      clinic: 7,
      id: 14,
    }
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        doc: {
          ...numericDoctor,
          active: false,
          profileImage: null,
        },
      }),
    )
    const provider = createPayloadDoctorProfileProvider("access-token", "7", fetcher)

    const result = await provider.createDoctor({
      biography: "Cardiology biography.",
      experienceYears: 12,
      firstName: "Amelia",
      gender: "female",
      languages: ["english", "german"],
      lastName: "Carter",
      qualifications: ["MD", "FESC"],
      title: "dr",
    })

    expect(result).toMatchObject({ ok: true, value: { active: false, id: "14" } })
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/doctors?depth=1")
    expect(JSON.parse(String(init?.body))).toEqual({
      active: false,
      biography: "Cardiology biography.",
      clinic: 7,
      experienceYears: 12,
      firstName: "Amelia",
      gender: "female",
      languages: ["english", "german"],
      lastName: "Carter",
      qualifications: ["MD", "FESC"],
      title: "dr",
    })
  })

  it.each(["clinic-alpha", "001", "9007199254740992"])(
    "preserves non-numeric Payload relationship id %s",
    async (clinicId) => {
      const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
        expect(JSON.parse(String(init?.body))).toMatchObject({ clinic: clinicId })
        return jsonResponse({
          doc: {
            ...upstreamDoctor,
            active: false,
            clinic: clinicId,
            profileImage: null,
          },
        })
      })
      const provider = createPayloadDoctorProfileProvider("access-token", clinicId, fetcher)

      await expect(
        provider.createDoctor({
          firstName: "Amelia",
          gender: "female",
          languages: ["english"],
          lastName: "Carter",
          qualifications: ["MD"],
        }),
      ).resolves.toMatchObject({ ok: true })
    },
  )

  it("fails closed before a cross-clinic doctor update", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ docs: [] }))
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(provider.updateDoctor("doctor-2", { active: false })).resolves.toEqual({
      error: "not-found",
      ok: false,
    })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      "where%5Band%5D%5B0%5D%5Bclinic%5D%5Bequals%5D=clinic-1",
    )
  })

  it.each([
    [400, "invalid-input"],
    [422, "invalid-input"],
    [409, "conflict"],
  ] as const)("maps a Payload %i mutation response to %s", async (status, expectedError) => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctors/doctor-1" && init?.method === "PATCH") {
        return jsonResponse({ error: "rejected" }, status)
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(provider.updateDoctor("doctor-1", { biography: "Updated." })).resolves.toEqual({
      error: expectedError,
      ok: false,
    })
  })

  it("accepts only catalogued specialties", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors") return jsonResponse({ docs: [upstreamDoctor] })
      if (url.pathname === "/api/medical-specialties") {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.createSpecialty("doctor-1", {
        medicalSpecialtyId: "specialty-not-reviewed",
        specializationLevel: "expert",
      }),
    ).resolves.toEqual({ error: "not-found", ok: false })
    expect(
      fetcher.mock.calls.some(
        ([input, init]) =>
          new URL(String(input)).pathname === "/api/doctorspecialties" && init?.method === "POST",
      ),
    ).toBe(false)
  })

  it("creates a reviewed specialty and maps the successful Payload response", async () => {
    const numericDoctor = {
      ...upstreamDoctor,
      clinic: 7,
      id: 14,
    }
    const numericSpecialties = [
      { id: 34, name: "Cardiology", parentSpecialty: null },
      {
        id: 35,
        name: "Interventional Cardiology",
        parentSpecialty: { id: 34, name: "Cardiology" },
      },
    ]
    const createdAssignment = {
      doctor: 14,
      id: 16,
      medicalSpecialty: {
        id: 35,
        name: "Interventional Cardiology",
      },
      specializationLevel: "expert",
    }
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [numericDoctor] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: numericSpecialties })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [] })
      }
      if (url.pathname === "/api/doctorspecialties" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          doctor: 14,
          medicalSpecialty: 35,
          specializationLevel: "expert",
        })
        return jsonResponse({ doc: createdAssignment }, 201)
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "7", fetcher)

    await expect(
      provider.createSpecialty("14", {
        medicalSpecialtyId: "35",
        specializationLevel: "expert",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "16",
        medicalSpecialtyId: "35",
        medicalSpecialtyName: "Interventional Cardiology",
        specializationLevel: "expert",
      },
    })
  })

  it("reconciles a specialty that was committed before a lost create response", async () => {
    let specialtyReads = 0
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        specialtyReads += 1
        return jsonResponse({ docs: specialtyReads === 1 ? [] : [upstreamAssignment] })
      }
      if (url.pathname === "/api/doctorspecialties" && init?.method === "POST") {
        return jsonResponse({ code: "CONFLICT" }, 409)
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.createSpecialty("doctor-1", {
        medicalSpecialtyId: "specialty-cardiology",
        specializationLevel: "specialist",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: { id: "assignment-1" },
    })
    expect(specialtyReads).toBe(2)
  })

  it("updates an existing specialty through its doctor-scoped assignment", async () => {
    const numericDoctor = {
      ...upstreamDoctor,
      clinic: 7,
      id: 14,
    }
    const numericSpecialties = [
      { id: 34, name: "Cardiology", parentSpecialty: null },
      {
        id: 35,
        name: "Interventional Cardiology",
        parentSpecialty: { id: 34, name: "Cardiology" },
      },
    ]
    const numericAssignment = {
      doctor: 14,
      id: 17,
      medicalSpecialty: { id: 34, name: "Cardiology" },
      specializationLevel: "specialist",
    }
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [numericDoctor] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: numericSpecialties })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        expect(url.searchParams.get("where[and][0][doctor][equals]")).toBe("14")
        expect(url.searchParams.get("where[and][1][id][equals]")).toBe("17")
        return jsonResponse({ docs: [numericAssignment] })
      }
      if (url.pathname === "/api/doctorspecialties/17" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({
          medicalSpecialty: 35,
          specializationLevel: "expert",
        })
        return jsonResponse({
          doc: {
            ...numericAssignment,
            medicalSpecialty: {
              id: 35,
              name: "Interventional Cardiology",
            },
            specializationLevel: "expert",
          },
        })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "7", fetcher)

    await expect(
      provider.updateSpecialty("14", "17", {
        medicalSpecialtyId: "35",
        specializationLevel: "expert",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "17",
        medicalSpecialtyId: "35",
        specializationLevel: "expert",
      },
    })
  })

  it("replaces the doctor image before cleaning up the previous media", async () => {
    const calls: string[] = []
    const numericDoctor = {
      ...upstreamDoctor,
      clinic: 7,
      id: 14,
      profileImage: {
        ...upstreamDoctor.profileImage,
        id: 22,
      },
    }
    const numericAssignment = {
      ...upstreamAssignment,
      doctor: 14,
      id: 17,
      medicalSpecialty: { id: 34, name: "Cardiology" },
    }
    const numericSpecialties = [{ id: 34, name: "Cardiology", parentSpecialty: null }]
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      calls.push(`${init?.method ?? "GET"} ${url.pathname}`)
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [numericDoctor] })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [numericAssignment] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: numericSpecialties })
      }
      if (url.pathname === "/api/doctorMedia" && init?.method === "POST") {
        const formData = init.body as FormData
        expect(JSON.parse(String(formData.get("_payload")))).toEqual({
          alt: "Updated portrait",
          clinic: 7,
          doctor: 14,
        })
        return jsonResponse({
          doc: {
            alt: "Updated portrait",
            clinic: 7,
            doctor: 14,
            id: 23,
            url: "/api/doctorMedia/file/amelia-new.png",
          },
        })
      }
      if (url.pathname === "/api/doctors" && init?.method === "PATCH") {
        expect(init.body).toBe('{"profileImage":23}')
        expect(url.searchParams.get("where[and][0][clinic][equals]")).toBe("7")
        expect(url.searchParams.get("where[and][1][id][equals]")).toBe("14")
        expect(url.searchParams.get("where[and][2][profileImage][equals]")).toBe("22")
        return jsonResponse({
          docs: [
            {
              ...numericDoctor,
              profileImage: {
                alt: "Updated portrait",
                id: 23,
                url: "/api/doctorMedia/file/amelia-new.png",
              },
            },
          ],
        })
      }
      if (url.pathname === "/api/doctorMedia/22" && init?.method === "DELETE") {
        return new Response(null, { status: 200 })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "7", fetcher)

    await expect(
      provider.replaceImage("14", {
        alt: "Updated portrait",
        bytes: new Uint8Array([1, 2, 3]),
        fileName: "amelia-new.png",
        mimeType: "image/png",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        cleanupPending: false,
        profile: {
          image: { id: "23" },
          specialties: [{ id: "17" }],
        },
      },
    })
    expect(calls).toEqual([
      "GET /api/doctors",
      "GET /api/doctorspecialties",
      "GET /api/medical-specialties",
      "POST /api/doctorMedia",
      "PATCH /api/doctors",
      "DELETE /api/doctorMedia/22",
    ])
  })

  it("returns the active image with a cleanup warning when old media deletion fails", async () => {
    let cleanupAttempts = 0
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorMedia" && init?.method === "POST") {
        return jsonResponse({
          doc: {
            alt: "Updated portrait",
            clinic: "clinic-1",
            doctor: "doctor-1",
            id: "media-new",
            url: "/api/doctorMedia/file/amelia-new.png",
          },
        })
      }
      if (url.pathname === "/api/doctors" && init?.method === "PATCH") {
        return jsonResponse({
          docs: [
            {
              ...upstreamDoctor,
              profileImage: {
                alt: "Updated portrait",
                id: "media-new",
                url: "/api/doctorMedia/file/amelia-new.png",
              },
            },
          ],
        })
      }
      if (url.pathname === "/api/doctorMedia/media-old" && init?.method === "DELETE") {
        cleanupAttempts += 1
        return jsonResponse({ code: "UNAVAILABLE" }, 500)
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.replaceImage("doctor-1", {
        alt: "Updated portrait",
        bytes: new Uint8Array([1, 2, 3]),
        fileName: "amelia-new.png",
        mimeType: "image/png",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        cleanupPending: true,
        profile: { image: { id: "media-new" } },
      },
    })
    expect(cleanupAttempts).toBe(2)
  })

  it("reconciles an image assignment committed before a lost PATCH response", async () => {
    let doctorReads = 0
    const deletedMedia: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        doctorReads += 1
        return jsonResponse({
          docs: [
            doctorReads === 1
              ? upstreamDoctor
              : {
                  ...upstreamDoctor,
                  profileImage: {
                    alt: "Updated portrait",
                    id: "media-new",
                    url: "/api/doctorMedia/file/amelia-new.png",
                  },
                },
          ],
        })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorMedia" && init?.method === "POST") {
        return jsonResponse({
          doc: {
            alt: "Updated portrait",
            clinic: "clinic-1",
            doctor: "doctor-1",
            id: "media-new",
            url: "/api/doctorMedia/file/amelia-new.png",
          },
        })
      }
      if (url.pathname === "/api/doctors" && init?.method === "PATCH") {
        throw new Error("response lost")
      }
      if (url.pathname.startsWith("/api/doctorMedia/") && init?.method === "DELETE") {
        deletedMedia.push(url.pathname)
        return new Response(null, { status: 200 })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.replaceImage("doctor-1", {
        alt: "Updated portrait",
        bytes: new Uint8Array([1, 2, 3]),
        fileName: "amelia-new.png",
        mimeType: "image/png",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        cleanupPending: false,
        profile: { image: { id: "media-new" } },
      },
    })
    expect(doctorReads).toBe(2)
    expect(deletedMedia).toEqual(["/api/doctorMedia/media-old"])
  })

  it("rejects a concurrent image replacement and removes its unused upload", async () => {
    const calls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      calls.push(`${init?.method ?? "GET"} ${url.pathname}`)
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorMedia" && init?.method === "POST") {
        return jsonResponse({
          doc: {
            alt: "Updated portrait",
            clinic: "clinic-1",
            doctor: "doctor-1",
            id: "media-new",
            url: "/api/doctorMedia/file/amelia-new.png",
          },
        })
      }
      if (url.pathname === "/api/doctors" && init?.method === "PATCH") {
        return jsonResponse({ docs: [] })
      }
      if (url.pathname === "/api/doctorMedia/media-new" && init?.method === "DELETE") {
        return new Response(null, { status: 200 })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.replaceImage("doctor-1", {
        alt: "Updated portrait",
        bytes: new Uint8Array([1, 2, 3]),
        fileName: "amelia-new.png",
        mimeType: "image/png",
      }),
    ).resolves.toEqual({ error: "conflict", ok: false })
    expect(calls.at(-1)).toBe("DELETE /api/doctorMedia/media-new")
  })

  it("cleans up a new media record when assigning it to the doctor fails", async () => {
    const calls: string[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      calls.push(`${init?.method ?? "GET"} ${url.pathname}`)
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorMedia" && init?.method === "POST") {
        return jsonResponse({
          doc: {
            alt: "Updated portrait",
            clinic: "clinic-1",
            doctor: "doctor-1",
            id: "media-new",
            url: "/api/doctorMedia/file/amelia-new.png",
          },
        })
      }
      if (url.pathname === "/api/doctors" && init?.method === "PATCH") {
        return jsonResponse({ error: "unavailable" }, 500)
      }
      if (url.pathname === "/api/doctorMedia/media-new" && init?.method === "DELETE") {
        return new Response(null, { status: 200 })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.replaceImage("doctor-1", {
        alt: "Updated portrait",
        bytes: new Uint8Array([1, 2, 3]),
        fileName: "amelia-new.png",
        mimeType: "image/png",
      }),
    ).resolves.toEqual({ error: "temporarily-unavailable", ok: false })
    expect(calls).toEqual([
      "GET /api/doctors",
      "GET /api/doctorspecialties",
      "GET /api/medical-specialties",
      "POST /api/doctorMedia",
      "PATCH /api/doctors",
      "DELETE /api/doctorMedia/media-new",
    ])
  })
})
