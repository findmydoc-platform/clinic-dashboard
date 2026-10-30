import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { handleClinicProfileLoad } from "@/features/clinic-dashboard/clinic-profile/server/clinic-profile-actions"
import type {
  ClinicProfileProvider,
  ClinicProfileProviderFactory,
} from "@/features/clinic-dashboard/clinic-profile/server/clinic-profile-provider"

const supabase = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  auth: {
    getClaims: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  },
}))

vi.mock("@supabase/ssr", () => ({ createServerClient: supabase.createServerClient }))

const snapshot = {
  availableCities: [{ id: "city-istanbul", name: "Istanbul" }],
  published: {
    address: {
      city: { id: "city-istanbul", name: "Istanbul" },
      country: { code: "TR", name: "Türkiye" },
      houseNumber: "12",
      street: "Synthetic Street",
      zipCode: "00123",
    },
    descriptionText: "Synthetic clinic profile.",
    name: "Clinic Two",
    revision: 4,
    supportedLanguages: ["english", "turkish"],
  },
} as const

function bootstrapResponse(capabilities: string[] = ["clinic-profile:view"]) {
  return Response.json(
    {
      schemaVersion: "clinic-scope-v1",
      principal: { displayName: "Alex Morgan", email: "alex@example.com", id: "staff-1" },
      status: "approved",
      clinics: [
        { id: "clinic-1", name: "Clinic One", capabilities: ["clinic-profile:edit"] },
        { id: "clinic-2", name: "Clinic Two", capabilities },
      ],
    },
    { headers: privateBootstrapHeaders },
  )
}

const privateBootstrapHeaders = {
  "cache-control": "private, no-store",
  vary: "Authorization, X-Findmydoc-Clinic-Dashboard-Contract, X-Findmydoc-Clinic-Scope-Contract",
}

describe("normal server clinic access through profile reads", () => {
  const loadSnapshot = vi.fn<ClinicProfileProvider["loadSnapshot"]>()
  const createProvider = vi.fn<ClinicProfileProviderFactory>(() => ({
    createDraft: vi.fn<ClinicProfileProvider["createDraft"]>(),
    discardDraft: vi.fn<ClinicProfileProvider["discardDraft"]>(),
    loadSnapshot,
    publishDraft: vi.fn<ClinicProfileProvider["publishDraft"]>(),
    saveDraft: vi.fn<ClinicProfileProvider["saveDraft"]>(),
  }))
  const fetcher = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", undefined)
    vi.stubEnv("CSRF_SIGNING_SECRET", "synthetic-csrf-signing-secret-for-tests-only") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("PAYLOAD_API_URL", "https://payload.example.invalid")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "synthetic-publishable-key")
    supabase.createServerClient.mockReturnValue({ auth: supabase.auth })
    supabase.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "staff-1", email: "alex@example.com", app_metadata: { user_type: "clinic" } } },
      error: null,
    })
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "synthetic-access-token" } },
      error: null,
    })
    fetcher.mockResolvedValue(bootstrapResponse())
    vi.stubGlobal("fetch", fetcher)
    loadSnapshot.mockResolvedValue({ ok: true, value: snapshot })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  function load(clinicId = "clinic-2") {
    return handleClinicProfileLoad(
      new NextRequest(`http://localhost:3000/api/dashboard/clinics/${clinicId}/profile`),
      createProvider,
    )
  }

  it("loads the requested authorized clinic with its verified session", async () => {
    const response = await load()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(snapshot)
    expect(createProvider).toHaveBeenCalledExactlyOnceWith("synthetic-access-token", "clinic-2")
    expect(loadSnapshot).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      new URL("https://payload.example.invalid/api/clinic-dashboard/bootstrap"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer synthetic-access-token" }),
      }),
    )
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
  })

  it("rejects a foreign clinic before creating or reading a provider", async () => {
    const response = await load("foreign-clinic")
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_ACCESS_DENIED" })
    expect(createProvider).not.toHaveBeenCalled()
    expect(loadSnapshot).not.toHaveBeenCalled()
  })

  it("requires the read right for the requested clinic even when it has an edit right", async () => {
    fetcher.mockResolvedValue(bootstrapResponse(["clinic-profile:edit"]))
    const response = await load()
    expect(response.status).toBe(403)
    expect(createProvider).not.toHaveBeenCalled()
    expect(loadSnapshot).not.toHaveBeenCalled()
  })

  it("rejects an unverified session without fetching bootstrap or reading clinic data", async () => {
    supabase.auth.getClaims.mockResolvedValue({ data: null, error: new Error("Synthetic invalid session") })
    const response = await load()
    expect(response.status).toBe(401)
    expect(fetcher).not.toHaveBeenCalled()
    expect(createProvider).not.toHaveBeenCalled()
    expect(loadSnapshot).not.toHaveBeenCalled()
  })

  it.each([
    { status: 403, code: "CLINIC_DASHBOARD_ACCESS_DENIED" },
    { status: 503, code: "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE" },
  ])("preserves a bootstrap $status without reading clinic data", async ({ status, code }) => {
    fetcher.mockResolvedValue(
      Response.json({ error: { code } }, { status, headers: privateBootstrapHeaders }),
    )
    const response = await load()
    expect(response.status).toBe(status)
    expect(createProvider).not.toHaveBeenCalled()
    expect(loadSnapshot).not.toHaveBeenCalled()
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled()
  })
})
