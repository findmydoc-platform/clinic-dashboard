// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createClinicProfileSourceApiCommands } from "@/features/clinic-dashboard/clinic-profile/browser/clinic-profile-api"
import { createPayloadClinicProfileProvider } from "@/features/clinic-dashboard/clinic-profile/server/payload-clinic-profile"
import type { ClinicProfileSnapshot } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source"
import { ClinicProfileSourceCommandError } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile-source-commands"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"
import {
  clinicProfileResponseCases,
  transformedClinicProfileResponseCase,
} from "../support/clinic-profile-response-cases"

function expectParsedSnapshot(actual: ClinicProfileSnapshot, expected: ClinicProfileSnapshot) {
  expect(actual).toStrictEqual(expected)
  expect(Object.hasOwn(actual, "draft")).toBe(Object.hasOwn(expected, "draft"))
  expect(Object.hasOwn(actual.published, "openingHours")).toBe(
    Object.hasOwn(expected.published, "openingHours"),
  )
  expect(Object.hasOwn(actual.published.address, "city")).toBe(
    Object.hasOwn(expected.published.address, "city"),
  )
  if (actual.draft && expected.draft) {
    expect(Object.hasOwn(actual.draft, "openingHours")).toBe(Object.hasOwn(expected.draft, "openingHours"))
    expect(Object.hasOwn(actual.draft.address, "city")).toBe(Object.hasOwn(expected.draft.address, "city"))
  }
}

async function expectInvalidBrowserResponse(result: Promise<ClinicProfileSnapshot>) {
  const error = await result.catch((failure: unknown) => failure)
  expect(error).toBeInstanceOf(ClinicProfileSourceCommandError)
  expect(error).toMatchObject({ outcome: "unknown", message: "Clinic profile response was invalid." })
}

const saveInput = {
  draft: {
    address: { houseNumber: "", street: "", zipCode: "" },
    descriptionText: "",
    name: "",
    supportedLanguages: [],
  },
  expectedDraftRevision: 2,
  expectedPublishedRevision: 4,
} as const

function privateResponse(body: string, status = 200) {
  return new Response(body, {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json",
      vary: "Authorization",
    },
    status,
  })
}

describe("Clinic profile response characterization", () => {
  beforeEach(() => {
    document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=synthetic-csrf; path=/`
    vi.stubEnv("CSRF_SIGNING_SECRET", "0123456789abcdef0123456789abcdef") // pragma: allowlist secret
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
  })

  afterEach(() => {
    document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe("browser command", () => {
    it.each(clinicProfileResponseCases)("$name", async ({ body, expected }) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify(body))),
      )
      const result = createClinicProfileSourceApiCommands("synthetic-clinic").loadSnapshot()
      if (expected) {
        expectParsedSnapshot(await result, expected)
      } else {
        await expectInvalidBrowserResponse(result)
      }
    })
  })

  describe("Payload provider", () => {
    it.each(clinicProfileResponseCases)("$name", async ({ body, expected }) => {
      const fetcher: typeof fetch = async () => privateResponse(JSON.stringify(body))
      const result = await createPayloadClinicProfileProvider(
        "synthetic-token",
        "synthetic-clinic",
        fetcher,
      ).loadSnapshot()
      if (expected) {
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("Expected a parsed Payload snapshot")
        expectParsedSnapshot(result.value, expected)
      } else {
        expect(result).toStrictEqual({ error: "invalid-data", ok: false })
      }
    })
  })

  it("returns the complete independently parsed value from all five browser operations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(transformedClinicProfileResponseCase.body))),
    )
    const commands = createClinicProfileSourceApiCommands("synthetic-clinic")
    const results = await Promise.all([
      commands.loadSnapshot(),
      commands.createDraft({ expectedPublishedRevision: 4 }),
      commands.saveDraft(saveInput),
      commands.discardDraft({ expectedDraftRevision: 2 }),
      commands.publishDraft({ expectedDraftRevision: 2, expectedPublishedRevision: 4 }),
    ])
    for (const result of results) expectParsedSnapshot(result, transformedClinicProfileResponseCase.expected)
  })

  it("returns the complete independently parsed value from all five Payload operations", async () => {
    const fetcher: typeof fetch = async () =>
      privateResponse(JSON.stringify(transformedClinicProfileResponseCase.body))
    const provider = createPayloadClinicProfileProvider("synthetic-token", "synthetic-clinic", fetcher)
    const results = await Promise.all([
      provider.loadSnapshot(),
      provider.createDraft({ expectedPublishedRevision: 4 }),
      provider.saveDraft(saveInput),
      provider.discardDraft({ expectedDraftRevision: 2 }),
      provider.publishDraft({ expectedDraftRevision: 2, expectedPublishedRevision: 4 }),
    ])
    for (const result of results) {
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error("Expected a parsed Payload snapshot")
      expectParsedSnapshot(result.value, transformedClinicProfileResponseCase.expected)
    }
  })

  it.each(["{", JSON.stringify({ unexpected: "private data" })])(
    "browser load and mutation retain unknown for an invalid successful body %s",
    async (body) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(body)),
      )
      const commands = createClinicProfileSourceApiCommands("synthetic-clinic")
      await expectInvalidBrowserResponse(commands.loadSnapshot())
      await expectInvalidBrowserResponse(commands.saveDraft(saveInput))
    },
  )

  it.each(["{", JSON.stringify({ unexpected: "private data" })])(
    "Payload load and mutation retain invalid-data for a properly private invalid successful body %s",
    async (body) => {
      const fetcher: typeof fetch = async () => privateResponse(body)
      const provider = createPayloadClinicProfileProvider("synthetic-token", "synthetic-clinic", fetcher)
      expect(await provider.loadSnapshot()).toStrictEqual({ error: "invalid-data", ok: false })
      expect(await provider.saveDraft(saveInput)).toStrictEqual({ error: "invalid-data", ok: false })
    },
  )

  it.each([
    {
      name: "missing private headers before malformed successful JSON",
      status: 200,
      privateHeaders: false,
      expected: "temporarily-unavailable",
    },
    {
      name: "missing private headers before unauthorized status",
      status: 401,
      privateHeaders: false,
      expected: "temporarily-unavailable",
    },
    {
      name: "properly private unauthorized status before malformed JSON",
      status: 401,
      privateHeaders: true,
      expected: "unauthorized",
    },
  ])("Payload prioritizes $name", async ({ status, privateHeaders, expected }) => {
    const fetcher: typeof fetch = async () =>
      privateHeaders ? privateResponse("{", status) : new Response("{", { status })
    const provider = createPayloadClinicProfileProvider("synthetic-token", "synthetic-clinic", fetcher)
    expect(await provider.loadSnapshot()).toStrictEqual({ error: expected, ok: false })
    expect(await provider.saveDraft(saveInput)).toStrictEqual({ error: expected, ok: false })
  })

  it.each([
    { status: 400, read: "temporarily-unavailable", mutation: "invalid-input" },
    { status: 401, read: "unauthorized", mutation: "unauthorized" },
    { status: 403, read: "forbidden", mutation: "forbidden" },
    { status: 404, read: "temporarily-unavailable", mutation: "not-found" },
    { status: 409, read: "temporarily-unavailable", mutation: "conflict" },
    { status: 422, read: "temporarily-unavailable", mutation: "invalid-input" },
    { status: 503, read: "temporarily-unavailable", mutation: "temporarily-unavailable" },
  ])(
    "Payload keeps read and mutation meanings for private status $status",
    async ({ status, read, mutation }) => {
      const fetcher: typeof fetch = async () => privateResponse("{", status)
      const provider = createPayloadClinicProfileProvider("synthetic-token", "synthetic-clinic", fetcher)
      expect(await provider.loadSnapshot()).toStrictEqual({ error: read, ok: false })
      expect(await provider.saveDraft(saveInput)).toStrictEqual({ error: mutation, ok: false })
    },
  )

  it("retains transport failures without inventing a confirmed mutation result", async () => {
    const fetcher: typeof fetch = async () => {
      throw new TypeError("Synthetic network failure")
    }
    vi.stubGlobal("fetch", fetcher)
    const commands = createClinicProfileSourceApiCommands("synthetic-clinic")
    await expect(commands.loadSnapshot()).rejects.toMatchObject({
      outcome: "unknown",
      message: "Clinic profile load outcome is unknown.",
    })
    await expect(commands.saveDraft(saveInput)).rejects.toMatchObject({
      outcome: "unknown",
      message: "Clinic profile operation outcome is unknown.",
    })
    const provider = createPayloadClinicProfileProvider("synthetic-token", "synthetic-clinic", fetcher)
    expect(await provider.loadSnapshot()).toStrictEqual({ error: "temporarily-unavailable", ok: false })
    expect(await provider.saveDraft(saveInput)).toStrictEqual({ error: "temporarily-unavailable", ok: false })
  })
})
