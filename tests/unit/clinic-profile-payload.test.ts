import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPayloadClinicProfileProvider } from "@/features/clinic-dashboard/clinic-profile/server/payload-clinic-profile"

const sourceSnapshot = {
  availableCities: [
    { id: "city-istanbul", name: "Istanbul" },
    { id: "city-ankara", name: "Ankara" },
  ],
  published: {
    address: {
      city: { id: "city-istanbul", name: "Istanbul" },
      country: { code: "TR", name: "Türkiye" },
      houseNumber: "12",
      street: "Bağdat Avenue",
      zipCode: "00123",
    },
    descriptionText: "Clinic overview.",
    name: "Clinic One",
    revision: 4,
    supportedLanguages: ["english", "turkish"],
  },
} as const

function privateJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json",
      vary: "Authorization",
    },
    status,
  })
}

describe("Clinic profile Payload provider", () => {
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

  it("loads the minimized profile contract from the isolated expected endpoint", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => privateJsonResponse(sourceSnapshot))
    const provider = createPayloadClinicProfileProvider("access-token", "server-clinic", fetcher)

    await expect(provider.loadSnapshot()).resolves.toEqual({ ok: true, value: sourceSnapshot })
    expect(fetcher).toHaveBeenCalledOnce()
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://preview.findmydoc.eu/api/clinic-dashboard/profile",
    )
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer access-token",
      },
      redirect: "error",
    })
  })

  it("saves revisions and editable fields without forwarding clinic, country, or coordinates", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      privateJsonResponse({
        ...sourceSnapshot,
        draft: {
          ...sourceSnapshot.published,
          basePublishedRevision: 4,
          revision: 2,
        },
      }),
    )
    const provider = createPayloadClinicProfileProvider("access-token", "server-clinic", fetcher)
    const input = {
      draft: {
        address: {
          cityId: "city-istanbul",
          houseNumber: "12",
          street: "Bağdat Avenue",
          zipCode: "00123",
        },
        descriptionText: "Clinic overview.",
        name: "Clinic One",
        supportedLanguages: ["english", "turkish"],
      },
      expectedDraftRevision: 1,
      expectedPublishedRevision: 4,
    } as const

    await expect(provider.saveDraft(input)).resolves.toMatchObject({
      ok: true,
      value: { draft: { revision: 2 } },
    })

    const [endpoint, init] = fetcher.mock.calls[0] ?? []
    expect(String(endpoint)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/profile/draft")
    expect(init).toMatchObject({ cache: "no-store", method: "PUT", redirect: "error" })
    const body = JSON.parse(String(init?.body))
    expect(body).toEqual(input)
    expect(JSON.stringify(body)).not.toMatch(/clinicId|country|coordinates/u)
  })

  it("creates a draft with only the expected published revision", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      privateJsonResponse({
        ...sourceSnapshot,
        draft: {
          ...sourceSnapshot.published,
          basePublishedRevision: 4,
          revision: 1,
        },
      }),
    )
    const provider = createPayloadClinicProfileProvider("access-token", "server-clinic", fetcher)

    await expect(provider.createDraft({ expectedPublishedRevision: 4 })).resolves.toMatchObject({
      ok: true,
      value: { draft: { revision: 1 } },
    })

    const [endpoint, init] = fetcher.mock.calls[0] ?? []
    expect(String(endpoint)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/profile/draft")
    expect(init).toMatchObject({ cache: "no-store", method: "POST", redirect: "error" })
    expect(JSON.parse(String(init?.body))).toEqual({ expectedPublishedRevision: 4 })
  })

  it("fails closed on broadened or non-private success responses", async () => {
    const broadenedFetcher = vi.fn<typeof fetch>(async () =>
      privateJsonResponse({
        ...sourceSnapshot,
        published: {
          ...sourceSnapshot.published,
          coordinates: [29.1, 41.1],
        },
      }),
    )
    await expect(
      createPayloadClinicProfileProvider("access-token", "server-clinic", broadenedFetcher).loadSnapshot(),
    ).resolves.toEqual({ error: "invalid-data", ok: false })

    const cacheableFetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(sourceSnapshot), {
          headers: { "content-type": "application/json" },
        }),
    )
    await expect(
      createPayloadClinicProfileProvider("access-token", "server-clinic", cacheableFetcher).loadSnapshot(),
    ).resolves.toEqual({ error: "temporarily-unavailable", ok: false })
  })

  it("rejects a profile city outside the provided Türkiye city catalogue", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      privateJsonResponse({
        ...sourceSnapshot,
        published: {
          ...sourceSnapshot.published,
          address: {
            ...sourceSnapshot.published.address,
            city: { id: "city-berlin", name: "Berlin" },
          },
        },
      }),
    )

    await expect(
      createPayloadClinicProfileProvider("access-token", "server-clinic", fetcher).loadSnapshot(),
    ).resolves.toEqual({ error: "invalid-data", ok: false })
  })

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not-found"],
    [409, "conflict"],
    [422, "invalid-input"],
    [500, "temporarily-unavailable"],
  ] as const)("maps an upstream %i mutation to %s", async (status, error) => {
    const fetcher = vi.fn<typeof fetch>(async () => privateJsonResponse({ error: "rejected" }, status))
    const provider = createPayloadClinicProfileProvider("access-token", "server-clinic", fetcher)

    await expect(
      provider.publishDraft({
        expectedDraftRevision: 2,
        expectedPublishedRevision: 4,
      }),
    ).resolves.toEqual({ error, ok: false })
  })
})
