import "server-only"

import { z } from "zod"
import { validateEnvironment } from "@/lib/env"
import type {
  ClinicGalleryErrorCode,
  ClinicGalleryMedia,
  ClinicGallerySaveInput,
  ClinicGallerySnapshot,
  ClinicGalleryUploadInput,
} from "../model/clinic-gallery"
import type { ClinicGalleryProvider, ClinicGalleryProviderResult } from "./clinic-gallery-provider"

const mediaSchema = z.object({
  alt: z.string(),
  captionText: z.string().optional(),
  height: z.number().int().positive().optional(),
  id: z.string().min(1),
  status: z.enum(["draft", "published"]),
  thumbnailUrl: z.string().url().optional(),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
})
const snapshotSchema = z.object({
  constraints: z.object({
    acceptedMimeTypes: z.array(z.string()).readonly(),
    maxConcurrentUploads: z.literal(3),
    maxFileBytes: z.number().int().positive(),
    maxItems: z.number().int().positive(),
    maxPixels: z.number().int().positive(),
  }),
  items: z.array(mediaSchema),
  revision: z.number().int().nonnegative(),
})

function endpoint(path = "") {
  return new URL(`/api/clinic-dashboard/gallery${path}`, validateEnvironment().PAYLOAD_API_URL)
}

function errorForStatus(status: number | undefined): ClinicGalleryErrorCode {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "media-not-found"
  if (status === 409) return "conflict"
  if (status === 413) return "upload-too-large"
  if (status === 415) return "unsupported-media-type"
  if (status === 400 || status === 422) return "invalid-input"
  return "unavailable"
}

async function payloadRequest<T>(
  accessToken: string,
  url: URL,
  init: RequestInit,
  schema: z.ZodType<T>,
  fetcher: typeof fetch,
): Promise<ClinicGalleryProviderResult<T>> {
  try {
    const response = await fetcher(url, {
      ...init,
      cache: "no-store",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}`, ...init.headers },
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok) return { error: errorForStatus(response.status), ok: false }
    const parsed = schema.safeParse(await response.json().catch(() => null))
    return parsed.success ? { ok: true, value: parsed.data } : { error: "unavailable", ok: false }
  } catch {
    return { error: "unavailable", ok: false }
  }
}

export function createPayloadClinicGalleryProvider(
  accessToken: string,
  _clinicId: string,
  fetcher: typeof fetch = fetch,
): ClinicGalleryProvider {
  return {
    async discardDrafts(mediaIds) {
      const result = await payloadRequest(
        accessToken,
        endpoint("/discard"),
        {
          body: JSON.stringify({ mediaIds }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
        z.object({ mediaIds: z.array(z.string()) }),
        fetcher,
      )
      return result.ok ? { ok: true, value: undefined } : result
    },
    loadGallery: () =>
      payloadRequest<ClinicGallerySnapshot>(accessToken, endpoint(), {}, snapshotSchema, fetcher),
    async loadImage(sourceUrl) {
      let source: URL
      try {
        source = new URL(sourceUrl)
      } catch {
        return { error: "invalid-input", ok: false }
      }
      const galleryOrigin = endpoint().origin
      if (source.origin !== galleryOrigin || !source.pathname.startsWith("/api/clinicMedia/file/")) {
        return { error: "forbidden", ok: false }
      }
      try {
        const response = await fetcher(source, {
          cache: "no-store",
          headers: { Accept: "image/*", Authorization: `Bearer ${accessToken}` },
          redirect: "error",
          signal: AbortSignal.timeout(12_000),
        })
        if (!response.ok) return { error: errorForStatus(response.status), ok: false }
        const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase()
        if (!contentType || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(contentType)) {
          return { error: "unavailable", ok: false }
        }
        return { ok: true, value: { body: await response.arrayBuffer(), contentType } }
      } catch {
        return { error: "unavailable", ok: false }
      }
    },
    saveGallery: (input: ClinicGallerySaveInput) =>
      payloadRequest<ClinicGallerySnapshot>(
        accessToken,
        endpoint(),
        { body: JSON.stringify(input), headers: { "Content-Type": "application/json" }, method: "PUT" },
        snapshotSchema,
        fetcher,
      ),
    uploadMedia: (input: ClinicGalleryUploadInput) => {
      const body = new FormData()
      body.set("file", input.file)
      if (input.alt !== undefined) body.set("alt", input.alt)
      if (input.captionText !== undefined) body.set("captionText", input.captionText)
      return payloadRequest<ClinicGalleryMedia>(
        accessToken,
        endpoint("/media"),
        { body, method: "POST" },
        mediaSchema,
        fetcher,
      )
    },
  }
}
