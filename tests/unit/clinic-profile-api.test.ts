// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { createClinicProfileSourceApiCommands } from "@/features/clinic-dashboard/clinic-profile/browser/clinic-profile-api"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"

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

function setCsrfCookie(value: string) {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=${encodeURIComponent(value)}; path=/`
}

function clearCsrfCookie() {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
}

describe("Clinic profile browser API", () => {
  afterEach(() => {
    clearCsrfCookie()
    vi.unstubAllGlobals()
  })

  it("uses the four same-origin routes and sends only editable draft data", async () => {
    setCsrfCookie("csrf-token")
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(sourceSnapshot), {
          headers: { "content-type": "application/json" },
        }),
    )
    vi.stubGlobal("fetch", fetcher)
    const commands = createClinicProfileSourceApiCommands()
    const draftInput = {
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
    } as const

    await commands.loadSnapshot()
    await commands.saveDraft(draftInput)
    await commands.discardDraft({ expectedDraftRevision: 1 })
    await commands.publishDraft({ expectedDraftRevision: 1, expectedPublishedRevision: 4 })

    expect(fetcher.mock.calls.map(([endpoint]) => endpoint)).toEqual([
      "/api/dashboard/profile",
      "/api/dashboard/profile/draft",
      "/api/dashboard/profile/draft/discard",
      "/api/dashboard/profile/publish",
    ])
    expect(fetcher.mock.calls.map(([, init]) => init?.method)).toEqual([undefined, "PUT", "POST", "POST"])
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
    })
    const saveBody = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))
    expect(saveBody).toEqual(draftInput)
    expect(JSON.stringify(saveBody)).not.toMatch(/clinicId|country|coordinates/u)
  })

  it("surfaces a 409 as an explicit optimistic concurrency conflict", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "CLINIC_PROFILE_CONFLICT" }), { status: 409 })),
    )

    await expect(
      createClinicProfileSourceApiCommands().publishDraft({
        expectedDraftRevision: 1,
        expectedPublishedRevision: 4,
      }),
    ).rejects.toMatchObject({ outcome: "conflict" })
  })

  it("fails closed when a success response contains non-profile private data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ...sourceSnapshot,
              published: {
                ...sourceSnapshot.published,
                coordinates: [29.1, 41.1],
              },
            }),
          ),
      ),
    )

    await expect(createClinicProfileSourceApiCommands().loadSnapshot()).rejects.toMatchObject({
      outcome: "unknown",
    })
  })
})
