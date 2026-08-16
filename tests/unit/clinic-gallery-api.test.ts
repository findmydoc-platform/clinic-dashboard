// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { createClinicGalleryApiCommands } from "@/features/clinic-dashboard/clinic-profile/browser/clinic-gallery-api"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"

function setCsrfCookie(value: string) {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=${encodeURIComponent(value)}; path=/`
}

describe("Clinic gallery browser API", () => {
  afterEach(() => {
    document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
    vi.unstubAllGlobals()
  })

  it("sends one verified multipart file without overriding its boundary", async () => {
    setCsrfCookie("csrf-token")
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBeInstanceOf(FormData)
      expect(new Headers(init?.headers).has("content-type")).toBe(false)
      expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-token")
      return new Response(
        JSON.stringify({
          alt: "",
          id: "draft-1",
          status: "draft",
          url: "https://preview.findmydoc.eu/api/clinicMedia/file/draft.jpg",
        }),
        { status: 201 },
      )
    })
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createClinicGalleryApiCommands().uploadMedia({
        file: new File(["image"], "clinic.jpg", { type: "image/jpeg" }),
      }),
    ).resolves.toMatchObject({ id: "draft-1", status: "draft" })
  })

  it("preserves the stable revision-conflict error", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "CLINIC_GALLERY_CONFLICT" }), { status: 409 })),
    )

    await expect(
      createClinicGalleryApiCommands().saveGallery({ expectedRevision: 4, items: [] }),
    ).rejects.toMatchObject({ code: "conflict" })
  })

  it("discards only the requested draft media through the protected endpoint", async () => {
    setCsrfCookie("csrf-token")
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ mediaIds: ["draft-1"] }), { status: 202 }),
    )
    vi.stubGlobal("fetch", fetcher)

    await createClinicGalleryApiCommands().discardDrafts(["draft-1"])

    expect(fetcher).toHaveBeenCalledWith(
      "/api/dashboard/gallery/discard",
      expect.objectContaining({
        body: JSON.stringify({ mediaIds: ["draft-1"] }),
        method: "POST",
      }),
    )
    const init = fetcher.mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json")
    expect(new Headers(init?.headers).get("x-csrf-token")).toBe("csrf-token")
  })
})
