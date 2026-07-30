import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const accessMocks = vi.hoisted(() => ({
  resolveClinicDashboardRouteAccess: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  getClinicDashboardAccess: vi.fn(),
  getClinicDashboardAccessToken: vi.fn(),
  resolveClinicDashboardRouteAccess: accessMocks.resolveClinicDashboardRouteAccess,
}))

import {
  handleClinicProfileDraftDiscard,
  handleClinicProfileDraftSave,
  handleClinicProfileLoad,
  handleClinicProfilePublish,
} from "@/features/clinic-dashboard/server"

const sourceSnapshot = {
  availableCities: [{ id: "city-istanbul", name: "Istanbul" }],
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

function privatePayloadResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json",
      vary: "Authorization",
    },
    status,
  })
}

function mutationRequest(pathname: string, body: unknown, method: "POST" | "PUT" = "POST") {
  const url = `http://localhost:3000${pathname}`
  const unsignedRequest = new NextRequest(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    method,
  })
  const token = createCsrfToken(unsignedRequest)

  return new NextRequest(url, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      cookie: `clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method,
  })
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
  expect(response.headers.get("vary")).toBe("Cookie")
}

const protectedRouteCases: ReadonlyArray<Readonly<{ invoke: () => Promise<Response>; routeName: string }>> = [
  {
    invoke: () => handleClinicProfileLoad(new NextRequest("http://localhost:3000/api/dashboard/profile")),
    routeName: "load",
  },
  {
    invoke: () =>
      handleClinicProfileDraftSave(
        mutationRequest(
          "/api/dashboard/profile/draft",
          {
            draft: {
              address: {
                cityId: "city-istanbul",
                houseNumber: "12",
                street: "Bağdat Avenue",
                zipCode: "00123",
              },
              descriptionText: "Clinic overview.",
              name: "Clinic One",
              supportedLanguages: ["english"],
            },
            expectedDraftRevision: null,
            expectedPublishedRevision: 4,
          },
          "PUT",
        ),
      ),
    routeName: "save",
  },
  {
    invoke: () =>
      handleClinicProfileDraftDiscard(
        mutationRequest("/api/dashboard/profile/draft/discard", {
          expectedDraftRevision: 1,
        }),
      ),
    routeName: "discard",
  },
  {
    invoke: () =>
      handleClinicProfilePublish(
        mutationRequest("/api/dashboard/profile/publish", {
          expectedDraftRevision: 1,
          expectedPublishedRevision: 4,
        }),
      ),
    routeName: "publish",
  },
]

const deniedAccessCases = [
  {
    accessStatus: "unauthenticated",
    expectedCode: "CLINIC_PROFILE_UNAUTHORIZED",
    expectedStatus: 401,
  },
  {
    accessStatus: "unauthorized",
    expectedCode: "CLINIC_PROFILE_UNAUTHORIZED",
    expectedStatus: 401,
  },
  { accessStatus: "denied", expectedCode: "CLINIC_PROFILE_ACCESS_DENIED", expectedStatus: 403 },
  {
    accessStatus: "temporarily-unavailable",
    expectedCode: "CLINIC_PROFILE_SERVICE_UNAVAILABLE",
    expectedStatus: 503,
  },
] as const

const routeAccessFailureCases = protectedRouteCases.flatMap((route) =>
  deniedAccessCases.map((access) => ({ ...route, ...access })),
)

describe("Clinic profile BFF routes", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
      accessToken: "access-token",
      applyToResponse: (response: Response) => {
        response.headers.set("x-session-applied", "true")
        return response
      },
      clinicId: "server-derived-clinic",
      status: "approved",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("loads the authenticated clinic profile through the private no-store boundary", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => privatePayloadResponse(sourceSnapshot))
    vi.stubGlobal("fetch", fetcher)

    const response = await handleClinicProfileLoad(
      new NextRequest("http://localhost:3000/api/dashboard/profile"),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(sourceSnapshot)
    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://preview.findmydoc.eu/api/clinic-dashboard/profile",
    )
    expect(response.headers.get("x-session-applied")).toBe("true")
    expect(accessMocks.resolveClinicDashboardRouteAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "clinic-profile:view",
    )
    expectPrivate(response)
  })

  it("saves a draft with server-derived scope and no clinic, country, or coordinates input", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      privatePayloadResponse({
        ...sourceSnapshot,
        draft: {
          ...sourceSnapshot.published,
          basePublishedRevision: 4,
          revision: 1,
        },
      }),
    )
    vi.stubGlobal("fetch", fetcher)
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
      expectedDraftRevision: null,
      expectedPublishedRevision: 4,
    }

    const response = await handleClinicProfileDraftSave(
      mutationRequest("/api/dashboard/profile/draft", input, "PUT"),
    )

    expect(response.status).toBe(200)
    const [, upstreamInit] = fetcher.mock.calls[0] ?? []
    const upstreamBody = JSON.parse(String(upstreamInit?.body))
    expect(upstreamBody).toEqual(input)
    expect(JSON.stringify(upstreamBody)).not.toMatch(/clinicId|country|coordinates/u)
    expect(upstreamInit).toMatchObject({ method: "PUT" })
    expect(accessMocks.resolveClinicDashboardRouteAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "clinic-profile:edit",
    )
    expectPrivate(response)
  })

  it("maps an optimistic publication conflict without overwriting", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => privatePayloadResponse({ error: { code: "CLINIC_PROFILE_CONFLICT" } }, 409)),
    )

    const response = await handleClinicProfilePublish(
      mutationRequest("/api/dashboard/profile/publish", {
        expectedDraftRevision: 1,
        expectedPublishedRevision: 4,
      }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_CONFLICT" })
    expectPrivate(response)
  })

  it("requires CSRF verification before every mutation provider call", async () => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const response = await handleClinicProfilePublish(
      new NextRequest("http://localhost:3000/api/dashboard/profile/publish", {
        body: JSON.stringify({
          expectedDraftRevision: 1,
          expectedPublishedRevision: 4,
        }),
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        method: "POST",
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })
    expect(fetcher).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it("rejects browser attempts to choose clinic, country, or coordinates before provider access", async () => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    const response = await handleClinicProfileDraftSave(
      mutationRequest(
        "/api/dashboard/profile/draft",
        {
          clinicId: "other-clinic",
          draft: {
            address: {
              cityId: "city-istanbul",
              coordinates: [29.1, 41.1],
              country: "DE",
              houseNumber: "12",
              street: "Bağdat Avenue",
              zipCode: "00123",
            },
            descriptionText: "Clinic overview.",
            name: "Clinic One",
            supportedLanguages: ["english"],
          },
          expectedDraftRevision: null,
          expectedPublishedRevision: 4,
        },
        "PUT",
      ),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_INPUT" })
    expect(fetcher).not.toHaveBeenCalled()
    expectPrivate(response)
  })

  it.each(routeAccessFailureCases)(
    "rejects $routeName for $accessStatus access before provider use",
    async ({ accessStatus, expectedStatus, expectedCode, invoke }) => {
      const fetcher = vi.fn()
      vi.stubGlobal("fetch", fetcher)
      accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
        applyToResponse: (response: Response) => response,
        status: accessStatus,
      })

      const response = await invoke()

      expect(response.status).toBe(expectedStatus)
      await expect(response.json()).resolves.toEqual({ code: expectedCode })
      expect(fetcher).not.toHaveBeenCalled()
      expectPrivate(response)
    },
  )

  it("rejects a streamed request body over 64 KiB without a Content-Length header", async () => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)
    const url = "http://localhost:3000/api/dashboard/profile/draft"
    const unsignedRequest = new NextRequest(url, {
      headers: { origin: "http://localhost:3000" },
      method: "PUT",
    })
    const token = createCsrfToken(unsignedRequest)
    const encodedBody = new TextEncoder().encode(`{"padding":"${"x".repeat(64 * 1024)}"}`)
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encodedBody)
        controller.close()
      },
    })
    const streamedRequest = new Request(url, {
      body,
      duplex: "half",
      headers: {
        "content-type": "application/json",
        cookie: `clinic_dashboard_csrf=${token}`,
        [CLINIC_DASHBOARD_CSRF_HEADER]: token,
        origin: "http://localhost:3000",
      },
      method: "PUT",
    } as unknown as RequestInit)
    const request = new NextRequest(streamedRequest)
    expect(request.headers.has("content-length")).toBe(false)

    const response = await handleClinicProfileDraftSave(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_INPUT" })
    expect(fetcher).not.toHaveBeenCalled()
    expectPrivate(response)
  })
})
