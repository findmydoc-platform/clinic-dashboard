import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPayloadClinicGalleryProvider } from "@/features/clinic-dashboard/clinic-profile/server/payload-clinic-gallery"

const constraints = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  maxConcurrentUploads: 3,
  maxFileBytes: 4 * 1024 * 1024,
  maxItems: 12,
  maxPixels: 50_000_000,
}
const media = {
  alt: "Reception",
  id: "media-1",
  status: "published",
  url: "https://preview.findmydoc.eu/api/clinicMedia/file/reception.jpg",
}
const snapshot = { constraints, items: [media], revision: 7 }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status })
}

describe("Clinic gallery Payload adapter", () => {
  beforeEach(() => {
    vi.stubEnv("CSRF_SIGNING_SECRET", "test-only-csrf-signing-secret-value")
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

  it("loads the focused server-derived gallery contract", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse(snapshot))
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)
    await expect(provider.loadGallery()).resolves.toEqual({ ok: true, value: snapshot })
    const [input, init] = fetcher.mock.calls[0]
    expect(String(input)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/gallery")
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer access-token")
    expect(init).toMatchObject({ cache: "no-store", redirect: "error" })
  })

  it.each([
    ["upload concurrency", { ...snapshot, constraints: { ...constraints, maxConcurrentUploads: 4 } }],
    ["pixel limit", { ...snapshot, constraints: { ...constraints, maxPixels: undefined } }],
    ["revision", { ...snapshot, revision: -1 }],
  ])("fails closed when the Website contract drifts in %s", async (_contractPart, responseBody) => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse(responseBody))
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)

    await expect(provider.loadGallery()).resolves.toEqual({ error: "unavailable", ok: false })
  })

  it.each([
    [400, "invalid-input"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "media-not-found"],
    [409, "conflict"],
    [413, "upload-too-large"],
    [415, "unsupported-media-type"],
    [422, "invalid-input"],
    [503, "unavailable"],
  ] as const)("maps Website gallery status %s to %s", async (status, error) => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ code: "UPSTREAM_ERROR" }, status))
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)

    await expect(provider.loadGallery()).resolves.toEqual({ error, ok: false })
  })

  it("saves only revision, ordered media IDs and metadata", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("PUT")
      expect(JSON.parse(String(init?.body))).toEqual({
        expectedRevision: 7,
        items: [{ alt: "Reception", mediaId: "media-1" }],
      })
      return jsonResponse(snapshot)
    })
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)
    await expect(
      provider.saveGallery({ expectedRevision: 7, items: [{ alt: "Reception", mediaId: "media-1" }] }),
    ).resolves.toEqual({ ok: true, value: snapshot })
  })

  it("forwards one multipart file and maps stable upload failures", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("POST")
      expect(init?.body).toBeInstanceOf(FormData)
      const body = init?.body as FormData
      expect(body.get("file")).toBeInstanceOf(File)
      return jsonResponse({ code: "CLINIC_GALLERY_UPLOAD_TOO_LARGE" }, 413)
    })
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)
    await expect(
      provider.uploadMedia({ file: new File(["image"], "clinic.jpg", { type: "image/jpeg" }) }),
    ).resolves.toEqual({ error: "upload-too-large", ok: false })
  })

  it("discards only named draft media through the focused contract", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toBe("https://preview.findmydoc.eu/api/clinic-dashboard/gallery/discard")
      expect(init?.method).toBe("POST")
      expect(JSON.parse(String(init?.body))).toEqual({ mediaIds: ["draft-1"] })
      return jsonResponse({ mediaIds: ["draft-1"] })
    })
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)

    await expect(provider.discardDrafts(["draft-1"])).resolves.toEqual({ ok: true, value: undefined })
  })

  it("proxies only clinic-media files from the configured Payload origin", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }),
    )
    const provider = createPayloadClinicGalleryProvider("access-token", "clinic-1", fetcher)
    await expect(
      provider.loadImage("https://preview.findmydoc.eu/api/clinicMedia/file/reception.jpg"),
    ).resolves.toMatchObject({ ok: true, value: { contentType: "image/jpeg" } })
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("authorization")).toBe("Bearer access-token")

    await expect(
      provider.loadImage("https://attacker.example/api/clinicMedia/file/reception.jpg"),
    ).resolves.toEqual({ error: "forbidden", ok: false })
    await expect(
      provider.loadImage("https://preview.findmydoc.eu/api/users/file/avatar.jpg"),
    ).resolves.toEqual({ error: "forbidden", ok: false })
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
