import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  handleClinicGalleryDiscard,
  handleClinicGalleryRead,
  handleClinicGalleryImage,
  handleClinicGallerySave,
  handleClinicGalleryUpload,
} from "@/features/clinic-dashboard/clinic-profile/server/public"
import type { ClinicGalleryProviderFactory } from "@/features/clinic-dashboard/clinic-profile/server/clinic-gallery-provider"
import {
  openClinicGalleryImageSource,
  sealClinicGalleryImageSource,
} from "@/features/clinic-dashboard/clinic-profile/server/clinic-gallery-image-token"
import { createCsrfToken } from "@/lib/security/csrf"
import { CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const snapshot = {
  constraints: {
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    maxConcurrentUploads: 3,
    maxFileBytes: 4 * 1024 * 1024,
    maxItems: 12,
    maxPixels: 50_000_000,
  },
  items: [],
  revision: 4,
} as const
const provider = {
  discardDrafts: vi.fn(),
  loadGallery: vi.fn(),
  loadImage: vi.fn(),
  saveGallery: vi.fn(),
  uploadMedia: vi.fn(),
}
const createProvider = vi.fn(() => provider) satisfies ClinicGalleryProviderFactory

function controlledRequest(method: "GET" | "POST" | "PUT", body?: BodyInit, contentType?: string) {
  const endpoint = new URL("http://localhost:3000/api/dashboard/gallery")
  const init = {
    body,
    headers: { ...(contentType ? { "content-type": contentType } : {}), origin: "http://localhost:3000" },
    method,
  }
  const base = new NextRequest(endpoint, init)
  const token = createCsrfToken(base)
  return new NextRequest(endpoint, {
    ...init,
    headers: {
      ...init.headers,
      cookie: `clinic_dashboard_csrf=${token}; clinic_dashboard_controlled_session=controlled-clinic-staff`,
      [CLINIC_DASHBOARD_CSRF_HEADER]: token,
    },
  })
}

describe("Clinic gallery BFF", () => {
  beforeEach(() => {
    vi.stubEnv("CLINIC_DASHBOARD_AUTH_TEST_MODE", "controlled")
    vi.stubEnv("CLINIC_DASHBOARD_TEST_PASSWORD", "test-password")
    vi.stubEnv("CSRF_SIGNING_SECRET", "test-only-csrf-signing-secret-value")
    vi.stubEnv("DASHBOARD_ORIGIN", "http://localhost:3000")
    vi.stubEnv("EXPECTED_SUPABASE_PROJECT_REF", "abcdefghijklmnopqrst")
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    vi.stubEnv("SUPABASE_URL", "https://abcdefghijklmnopqrst.supabase.co")
    provider.loadGallery.mockResolvedValue({ ok: true, value: snapshot })
    provider.discardDrafts.mockResolvedValue({ ok: true, value: undefined })
    provider.saveGallery.mockResolvedValue({ ok: true, value: { ...snapshot, revision: 5 } })
    provider.uploadMedia.mockResolvedValue({
      ok: true,
      value: {
        alt: "",
        id: "draft-1",
        status: "draft",
        url: "https://preview.findmydoc.eu/api/clinicMedia/file/draft.jpg",
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it("keeps upstream image sources opaque and rejects modified proxy tokens", () => {
    const source = "https://preview.findmydoc.eu/api/clinicMedia/file/draft.jpg"
    const token = sealClinicGalleryImageSource(source)

    expect(token).not.toContain("preview.findmydoc.eu")
    expect(openClinicGalleryImageSource(token)).toBe(source)
    expect(openClinicGalleryImageSource(`${token}modified`)).toBeUndefined()
  })

  it("reads privately through the server-derived clinic provider", async () => {
    const response = await handleClinicGalleryRead(controlledRequest("GET"), createProvider)
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(createProvider).toHaveBeenCalledWith("controlled-access-token", "controlled-clinic")
    await expect(response.json()).resolves.toMatchObject({
      items: [],
    })
  })

  it("streams authorized clinic images privately through the BFF", async () => {
    provider.loadImage.mockResolvedValueOnce({
      ok: true,
      value: { body: new Uint8Array([1, 2, 3]).buffer, contentType: "image/jpeg" },
    })
    const request = controlledRequest("GET")
    request.nextUrl.searchParams.set(
      "token",
      sealClinicGalleryImageSource("https://preview.findmydoc.eu/api/clinicMedia/file/reception.jpg"),
    )
    const response = await handleClinicGalleryImage(request, createProvider)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/jpeg")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(provider.loadImage).toHaveBeenCalledWith(
      "https://preview.findmydoc.eu/api/clinicMedia/file/reception.jpg",
    )
  })

  it("accepts only the focused ordered save DTO and maps revision conflicts", async () => {
    const body = { expectedRevision: 4, items: [{ alt: "Reception", mediaId: "media-1" }] }
    const response = await handleClinicGallerySave(
      controlledRequest("PUT", JSON.stringify(body), "application/json"),
      createProvider,
    )
    expect(response.status).toBe(200)
    expect(provider.saveGallery).toHaveBeenCalledWith(body)

    const rejected = await handleClinicGallerySave(
      controlledRequest("PUT", JSON.stringify({ ...body, clinicId: "foreign-clinic" }), "application/json"),
      createProvider,
    )
    expect(rejected.status).toBe(400)

    provider.saveGallery.mockResolvedValueOnce({ error: "conflict", ok: false })
    expect(
      (
        await handleClinicGallerySave(
          controlledRequest("PUT", JSON.stringify(body), "application/json"),
          createProvider,
        )
      ).status,
    ).toBe(409)
  })

  it("accepts one verified multipart image and rejects oversized files before the provider", async () => {
    const form = new FormData()
    form.set("file", new File(["image"], "clinic.jpg", { type: "image/jpeg" }))
    const response = await handleClinicGalleryUpload(controlledRequest("POST", form), createProvider)
    expect(response.status).toBe(201)
    expect(provider.uploadMedia).toHaveBeenCalledWith(expect.objectContaining({ file: expect.any(File) }))

    const oversized = new FormData()
    oversized.set(
      "file",
      new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }),
    )
    const rejected = await handleClinicGalleryUpload(controlledRequest("POST", oversized), createProvider)
    expect(rejected.status).toBe(413)
    expect(provider.uploadMedia).toHaveBeenCalledOnce()
  })

  it("discards only validated draft IDs through the clinic-scoped provider", async () => {
    const response = await handleClinicGalleryDiscard(
      controlledRequest("POST", JSON.stringify({ mediaIds: ["draft-1"] }), "application/json"),
      createProvider,
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ mediaIds: ["draft-1"] })
    expect(provider.discardDrafts).toHaveBeenCalledWith(["draft-1"])
  })
})
