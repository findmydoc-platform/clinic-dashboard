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
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        doc: {
          ...upstreamDoctor,
          active: false,
          profileImage: null,
        },
      }),
    )
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

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

    expect(result).toMatchObject({ ok: true, value: { active: false, id: "doctor-1" } })
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/doctors?depth=1")
    expect(JSON.parse(String(init?.body))).toEqual({
      active: false,
      biography: "Cardiology biography.",
      clinic: "clinic-1",
      experienceYears: 12,
      firstName: "Amelia",
      gender: "female",
      languages: ["english", "german"],
      lastName: "Carter",
      qualifications: ["MD", "FESC"],
      title: "dr",
    })
  })

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
    const createdAssignment = {
      doctor: "doctor-1",
      id: "assignment-2",
      medicalSpecialty: {
        id: "specialty-interventional-cardiology",
        name: "Interventional Cardiology",
      },
      specializationLevel: "expert",
    }
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        return jsonResponse({ docs: [] })
      }
      if (url.pathname === "/api/doctorspecialties" && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          doctor: "doctor-1",
          medicalSpecialty: "specialty-interventional-cardiology",
          specializationLevel: "expert",
        })
        return jsonResponse({ doc: createdAssignment }, 201)
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.createSpecialty("doctor-1", {
        medicalSpecialtyId: "specialty-interventional-cardiology",
        specializationLevel: "expert",
      }),
    ).resolves.toEqual({
      ok: true,
      value: {
        id: "assignment-2",
        medicalSpecialtyId: "specialty-interventional-cardiology",
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
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input))
      if (url.pathname === "/api/doctors" && !init?.method) {
        return jsonResponse({ docs: [upstreamDoctor] })
      }
      if (url.pathname === "/api/medical-specialties" && !init?.method) {
        return jsonResponse({ docs: upstreamSpecialties })
      }
      if (url.pathname === "/api/doctorspecialties" && !init?.method) {
        expect(url.searchParams.get("where[and][0][doctor][equals]")).toBe("doctor-1")
        expect(url.searchParams.get("where[and][1][id][equals]")).toBe("assignment-1")
        return jsonResponse({ docs: [upstreamAssignment] })
      }
      if (url.pathname === "/api/doctorspecialties/assignment-1" && init?.method === "PATCH") {
        expect(JSON.parse(String(init.body))).toEqual({
          medicalSpecialty: "specialty-interventional-cardiology",
          specializationLevel: "expert",
        })
        return jsonResponse({
          doc: {
            ...upstreamAssignment,
            medicalSpecialty: {
              id: "specialty-interventional-cardiology",
              name: "Interventional Cardiology",
            },
            specializationLevel: "expert",
          },
        })
      }
      return jsonResponse({}, 500)
    })
    const provider = createPayloadDoctorProfileProvider("access-token", "clinic-1", fetcher)

    await expect(
      provider.updateSpecialty("doctor-1", "assignment-1", {
        medicalSpecialtyId: "specialty-interventional-cardiology",
        specializationLevel: "expert",
      }),
    ).resolves.toMatchObject({
      ok: true,
      value: {
        id: "assignment-1",
        medicalSpecialtyId: "specialty-interventional-cardiology",
        specializationLevel: "expert",
      },
    })
  })

  it("replaces the doctor image before cleaning up the previous media", async () => {
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
        const formData = init.body as FormData
        expect(JSON.parse(String(formData.get("_payload")))).toEqual({
          alt: "Updated portrait",
          clinic: "clinic-1",
          doctor: "doctor-1",
        })
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
        expect(init.body).toBe('{"profileImage":"media-new"}')
        expect(url.searchParams.get("where[and][0][clinic][equals]")).toBe("clinic-1")
        expect(url.searchParams.get("where[and][1][id][equals]")).toBe("doctor-1")
        expect(url.searchParams.get("where[and][2][profileImage][equals]")).toBe("media-old")
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
        profile: {
          image: { id: "media-new" },
          specialties: [{ id: "assignment-1" }],
        },
      },
    })
    expect(calls).toEqual([
      "GET /api/doctors",
      "GET /api/doctorspecialties",
      "GET /api/medical-specialties",
      "POST /api/doctorMedia",
      "PATCH /api/doctors",
      "DELETE /api/doctorMedia/media-old",
    ])
  })

  it("returns the active image with a cleanup warning when old media deletion fails", async () => {
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
