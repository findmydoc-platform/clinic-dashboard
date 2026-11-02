import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  ClinicProfileProvider,
  ClinicProfileProviderFactory,
} from "@/features/clinic-dashboard/clinic-profile/server/clinic-profile-provider"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const accessMocks = vi.hoisted(() => ({
  resolveClinicDashboardRouteAccess: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/public", () => ({
  resolveClinicDashboardRouteAccess: accessMocks.resolveClinicDashboardRouteAccess,
}))

import {
  handleClinicProfileDraftCreate,
  handleClinicProfileDraftDiscard,
  handleClinicProfileDraftSave,
  handleClinicProfileLoad,
  handleClinicProfilePublish,
} from "@/features/clinic-dashboard/clinic-profile/server/public"

const providerMocks = {
  createDraft: vi.fn<ClinicProfileProvider["createDraft"]>(),
  discardDraft: vi.fn<ClinicProfileProvider["discardDraft"]>(),
  loadSnapshot: vi.fn<ClinicProfileProvider["loadSnapshot"]>(),
  publishDraft: vi.fn<ClinicProfileProvider["publishDraft"]>(),
  saveDraft: vi.fn<ClinicProfileProvider["saveDraft"]>(),
}
const createProvider = vi.fn(
  (_accessToken: string, _clinicId: string) => providerMocks,
) satisfies ClinicProfileProviderFactory

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

const profilePath = "/api/dashboard/clinics/server-derived-clinic/profile"
const saveInput = {
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

const mutationCases = [
  {
    handler: handleClinicProfileDraftCreate,
    input: { expectedPublishedRevision: 4 },
    method: "POST",
    name: "create",
    operation: providerMocks.createDraft,
    path: `${profilePath}/draft`,
    value: {
      ...sourceSnapshot,
      draft: { ...sourceSnapshot.published, basePublishedRevision: 4, revision: 1 },
    },
  },
  {
    handler: handleClinicProfileDraftSave,
    input: saveInput,
    method: "PUT",
    name: "save",
    operation: providerMocks.saveDraft,
    path: `${profilePath}/draft`,
    value: {
      ...sourceSnapshot,
      draft: { ...sourceSnapshot.published, basePublishedRevision: 4, revision: 2 },
    },
  },
  {
    handler: handleClinicProfileDraftDiscard,
    input: { expectedDraftRevision: 1 },
    method: "POST",
    name: "discard",
    operation: providerMocks.discardDraft,
    path: `${profilePath}/draft/discard`,
    value: sourceSnapshot,
  },
  {
    handler: handleClinicProfilePublish,
    input: { expectedDraftRevision: 1, expectedPublishedRevision: 4 },
    method: "POST",
    name: "publish",
    operation: providerMocks.publishDraft,
    path: `${profilePath}/publish`,
    value: { ...sourceSnapshot, published: { ...sourceSnapshot.published, revision: 5 } },
  },
] as const

function mutationRequest(path: string, body: string | Uint8Array<ArrayBuffer>, method = "POST") {
  const url = `http://localhost:3000${path}`
  const unsignedRequest = new NextRequest(url, { method })
  const token = createCsrfToken(unsignedRequest)
  return new NextRequest(url, {
    body,
    headers: {
      "content-type": "application/json",
      cookie: `clinic_dashboard_csrf=${token}`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
      origin: "http://localhost:3000",
    },
    method,
  })
}

const actionCases = [
  {
    handler: handleClinicProfileLoad,
    name: "load",
    operation: providerMocks.loadSnapshot,
    request: () => new NextRequest(`http://localhost:3000${profilePath}`),
  },
  ...mutationCases.map(({ handler, input, method, name, operation, path }) => ({
    handler,
    name,
    operation,
    request: () => mutationRequest(path, JSON.stringify(input), method),
  })),
]

function completeResponse(response: Response) {
  response.headers.set("x-session-applied", "true")
  return response
}

function approvedAccess(applyToResponse = completeResponse) {
  return {
    accessToken: "verified-access-token",
    applyToResponse,
    clinicId: "server-derived-clinic",
    status: "approved",
  }
}

function expectPrivate(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("pragma")).toBe("no-cache")
  expect(response.headers.get("expires")).toBe("0")
  expect(response.headers.get("vary")).toBe("Cookie")
}

function expectCompleted(response: Response) {
  expectPrivate(response)
  expect(response.headers.get("x-session-applied")).toBe("true")
}

describe("Clinic profile route actions", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    createProvider.mockReturnValue(providerMocks)
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue(approvedAccess())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.each(["/api/dashboard/profile", "/api/dashboard/clinics/foreign-clinic/profile"])(
    "rejects an absent or mismatched target %s before source access",
    async (path) => {
      const response = await handleClinicProfileLoad(
        new NextRequest(`http://localhost:3000${path}`),
        createProvider,
      )
      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_ACCESS_DENIED" })
      expectPrivate(response)
      expect(response.headers.get("x-session-applied")).toBe(
        path === "/api/dashboard/profile" ? null : "true",
      )
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it("derives provider scope from authenticated route access, never browser input", async () => {
    providerMocks.loadSnapshot.mockResolvedValue({ ok: true, value: sourceSnapshot })
    const request = new NextRequest(
      "http://localhost:3000/api/dashboard/clinics/server-derived-clinic/profile?clinicId=other-clinic",
    )
    const body = vi.spyOn(request, "body", "get")

    const response = await handleClinicProfileLoad(request, createProvider)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(sourceSnapshot)
    expectCompleted(response)
    expect(body).not.toHaveBeenCalled()
    expect(createProvider).toHaveBeenCalledWith("verified-access-token", "server-derived-clinic")
    expect(accessMocks.resolveClinicDashboardRouteAccess).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "clinic-profile:view",
      "server-derived-clinic",
    )
    expect(providerMocks.loadSnapshot).toHaveBeenCalledOnce()
  })

  it.each(mutationCases)(
    "completes $name with its current snapshot, revision input and authenticated scope",
    async ({ handler, input, method, operation, path, value }) => {
      operation.mockResolvedValue({ ok: true, value })
      const request = mutationRequest(`${path}?clinicId=other-clinic`, JSON.stringify(input), method)
      accessMocks.resolveClinicDashboardRouteAccess.mockImplementation(async () => {
        expect(request.bodyUsed).toBe(false)
        return approvedAccess()
      })
      createProvider.mockImplementation(() => {
        expect(request.bodyUsed).toBe(true)
        return providerMocks
      })

      const response = await handler(request, createProvider)

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual(value)
      expectCompleted(response)
      expect(createProvider).toHaveBeenCalledExactlyOnceWith("verified-access-token", "server-derived-clinic")
      expect(accessMocks.resolveClinicDashboardRouteAccess).toHaveBeenCalledExactlyOnceWith(
        request,
        "clinic-profile:edit",
        "server-derived-clinic",
      )
      expect(operation.mock.calls).toEqual([[input]])
    },
  )

  it.each(mutationCases)(
    "rejects an invalid $name request before access, input reading or provider creation",
    async ({ handler, input, method, path }) => {
      const request = mutationRequest(path, JSON.stringify(input), method)
      request.headers.delete(CLINIC_DASHBOARD_CSRF_HEADER)
      const body = vi.spyOn(request, "body", "get")

      const response = await handler(request, createProvider)

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ code: "REQUEST_REJECTED" })
      expectPrivate(response)
      expect(response.headers.has("x-session-applied")).toBe(false)
      expect(accessMocks.resolveClinicDashboardRouteAccess).not.toHaveBeenCalled()
      expect(body).not.toHaveBeenCalled()
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it.each(mutationCases)(
    "completes invalid $name input without creating a provider",
    async ({ handler, method, path }) => {
      const response = await handler(mutationRequest(path, "{}", method), createProvider)

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ code: "INVALID_INPUT" })
      expectCompleted(response)
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it.each(mutationCases)(
    "completes a mismatched $name target before reading input or creating a provider",
    async ({ handler, input, method, path }) => {
      accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
        ...approvedAccess(),
        clinicId: "another-authorized-clinic",
      })
      const request = mutationRequest(path, JSON.stringify(input), method)
      const body = vi.spyOn(request, "body", "get")

      const response = await handler(request, createProvider)

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_ACCESS_DENIED" })
      expectCompleted(response)
      expect(body).not.toHaveBeenCalled()
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it.each(actionCases)(
    "completes denied $name access without reading input or creating a provider",
    async ({ handler, request: makeRequest }) => {
      accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
        applyToResponse: completeResponse,
        status: "denied",
      })
      const request = makeRequest()
      const body = vi.spyOn(request, "body", "get")

      const response = await handler(request, createProvider)

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_ACCESS_DENIED" })
      expectCompleted(response)
      expect(body).not.toHaveBeenCalled()
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it.each([
    { error: "unauthorized", status: 401, code: "CLINIC_PROFILE_UNAUTHORIZED" },
    { error: "forbidden", status: 403, code: "CLINIC_PROFILE_ACCESS_DENIED" },
    { error: "invalid-data", status: 502, code: "CLINIC_PROFILE_INVALID_RESPONSE" },
    { error: "temporarily-unavailable", status: 503, code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" },
  ] as const)("completes a read $error response", async ({ error, status, code }) => {
    providerMocks.loadSnapshot.mockResolvedValue({ ok: false, error })

    const response = await handleClinicProfileLoad(
      new NextRequest(`http://localhost:3000${profilePath}`),
      createProvider,
    )

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({ code })
    expectCompleted(response)
  })

  it.each([
    { error: "conflict", status: 409, code: "CLINIC_PROFILE_CONFLICT" },
    { error: "invalid-input", status: 400, code: "INVALID_INPUT" },
    { error: "not-found", status: 404, code: "CLINIC_PROFILE_DRAFT_NOT_FOUND" },
  ] as const)("completes a mutation $error response", async ({ error, status, code }) => {
    providerMocks.publishDraft.mockResolvedValue({ ok: false, error })

    const response = await handleClinicProfilePublish(
      mutationRequest(`${profilePath}/publish`, '{"expectedDraftRevision":1,"expectedPublishedRevision":4}'),
      createProvider,
    )

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({ code })
    expectCompleted(response)
  })

  it.each(actionCases)(
    "completes $name provider creation failures with the existing unavailable response",
    async ({ handler, request }) => {
      createProvider.mockImplementation(() => {
        throw new Error("Synthetic provider creation failure")
      })

      const response = await handler(request(), createProvider)

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" })
      expectCompleted(response)
    },
  )

  it.each(actionCases)(
    "completes $name provider execution failures with the existing unavailable response",
    async ({ handler, operation, request }) => {
      operation.mockRejectedValue(new Error("Synthetic provider execution failure"))

      const response = await handler(request(), createProvider)

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" })
      expectCompleted(response)
    },
  )

  it.each(actionCases)(
    "does not convert unexpected $name access failures into a provider response",
    async ({ handler, request }) => {
      const failure = new Error("Synthetic access failure")
      accessMocks.resolveClinicDashboardRouteAccess.mockRejectedValue(failure)

      await expect(handler(request(), createProvider)).rejects.toBe(failure)
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it.each(mutationCases)(
    "does not convert unexpected $name input preparation failures into a provider response",
    async ({ handler, input, method, path }) => {
      const failure = new Error("Synthetic request body failure")
      const request = mutationRequest(path, JSON.stringify(input), method)
      vi.spyOn(request, "body", "get").mockImplementation(() => {
        throw failure
      })

      await expect(handler(request, createProvider)).rejects.toBe(failure)
      expect(createProvider).not.toHaveBeenCalled()
    },
  )

  it.each(actionCases)(
    "uses the unavailable fallback when completing the first $name provider response throws",
    async ({ handler, operation, request }) => {
      operation.mockResolvedValue({ ok: true, value: sourceSnapshot })
      const applyToResponse = vi.fn(completeResponse).mockImplementationOnce(() => {
        throw new Error("Synthetic completion failure")
      })
      accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue(approvedAccess(applyToResponse))

      const response = await handler(request(), createProvider)

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({ code: "CLINIC_PROFILE_SERVICE_UNAVAILABLE" })
      expectCompleted(response)
    },
  )

  it("propagates a failure while completing the unavailable fallback", async () => {
    const failure = new Error("Synthetic fallback completion failure")
    providerMocks.loadSnapshot.mockRejectedValue(new Error("Synthetic provider failure"))
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue(
      approvedAccess(() => {
        throw failure
      }),
    )

    await expect(
      handleClinicProfileLoad(new NextRequest(`http://localhost:3000${profilePath}`), createProvider),
    ).rejects.toBe(failure)
  })

  it.each(["access", "input"])("propagates an early %s completion failure", async (rejection) => {
    const failure = new Error("Synthetic early completion failure")
    accessMocks.resolveClinicDashboardRouteAccess.mockResolvedValue({
      ...approvedAccess(() => {
        throw failure
      }),
      status: rejection === "access" ? "denied" : "approved",
    })

    await expect(
      handleClinicProfileDraftCreate(mutationRequest(`${profilePath}/draft`, "{}"), createProvider),
    ).rejects.toBe(failure)
    expect(createProvider).not.toHaveBeenCalled()
  })

  it.each([
    { name: "malformed JSON", body: '{"expectedPublishedRevision":' },
    { name: "a declared body over 64 KiB", body: '{"expectedPublishedRevision":4}', length: "65537" },
  ])("completes $name rejection before provider creation", async ({ body, length }) => {
    const request = mutationRequest(`${profilePath}/draft`, body)
    if (length) request.headers.set("content-length", length)

    const response = await handleClinicProfileDraftCreate(request, createProvider)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_INPUT" })
    expectCompleted(response)
    expect(createProvider).not.toHaveBeenCalled()
  })

  it("rejects invalid UTF-8 inside otherwise valid save input without creating a provider", async () => {
    const body = new TextEncoder().encode(JSON.stringify(saveInput))
    body[body.indexOf("C".charCodeAt(0))] = 0xff

    const response = await handleClinicProfileDraftSave(
      mutationRequest(`${profilePath}/draft`, body, "PUT"),
      createProvider,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ code: "INVALID_INPUT" })
    expectCompleted(response)
    expect(createProvider).not.toHaveBeenCalled()
  })

  it.each([65536, 65537])("keeps the 64 KiB limit for a %s byte body", async (bytes) => {
    const input = '{"expectedPublishedRevision":4}'
    const body = `${input}${" ".repeat(bytes - input.length)}`
    providerMocks.createDraft.mockResolvedValue({ ok: true, value: sourceSnapshot })

    const response = await handleClinicProfileDraftCreate(
      mutationRequest(`${profilePath}/draft`, body),
      createProvider,
    )

    expect(response.status).toBe(bytes === 65536 ? 200 : 400)
    await expect(response.json()).resolves.toEqual(
      bytes === 65536 ? sourceSnapshot : { code: "INVALID_INPUT" },
    )
    expectCompleted(response)
    if (bytes === 65536)
      expect(providerMocks.createDraft).toHaveBeenCalledWith({ expectedPublishedRevision: 4 })
    else expect(createProvider).not.toHaveBeenCalled()
  })
})
