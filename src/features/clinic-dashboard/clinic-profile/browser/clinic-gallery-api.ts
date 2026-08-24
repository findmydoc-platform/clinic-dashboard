"use client"

import { z } from "zod"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import type { ClinicGalleryMedia, ClinicGallerySnapshot } from "../model/clinic-gallery"
import { ClinicGalleryCommandError, type ClinicGalleryCommands } from "../model/clinic-gallery-commands"

const mediaSchema = z.object({
  alt: z.string(),
  captionText: z.string().optional(),
  height: z.number().int().positive().optional(),
  id: z.string().min(1),
  status: z.enum(["draft", "published"]),
  thumbnailUrl: z.string().min(1).optional(),
  url: z.string().min(1),
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

const errorCodeSchema = z.object({ code: z.string() })

function errorForResponse(response: Response, body: unknown) {
  const code = errorCodeSchema.safeParse(body).success
    ? errorCodeSchema.parse(body).code
    : body && typeof body === "object" && "error" in body
      ? errorCodeSchema.safeParse(body.error).data?.code
      : undefined

  if (response.status === 409 || code === "CLINIC_GALLERY_CONFLICT") {
    return new ClinicGalleryCommandError("conflict", "The gallery changed elsewhere.")
  }
  if (response.status === 401) return new ClinicGalleryCommandError("unauthorized", "Sign in again.")
  if (response.status === 403) return new ClinicGalleryCommandError("forbidden", "Gallery access denied.")
  if (response.status === 404) {
    return new ClinicGalleryCommandError("media-not-found", "An image is no longer available.")
  }
  if (response.status === 413) {
    return new ClinicGalleryCommandError("upload-too-large", "The image exceeds the upload limit.")
  }
  if (response.status === 415) {
    return new ClinicGalleryCommandError("unsupported-media-type", "This image format is not supported.")
  }
  if (response.status === 400 || response.status === 422) {
    return new ClinicGalleryCommandError("invalid-input", "Check the gallery details and try again.")
  }
  return new ClinicGalleryCommandError("unavailable", "The gallery is temporarily unavailable.")
}

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw errorForResponse(response, body)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ClinicGalleryCommandError("unavailable", "The gallery response was invalid.")
  }
  return parsed.data
}

async function request(endpoint: string, init: RequestInit = {}) {
  try {
    return await fetch(endpoint, {
      ...init,
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json", ...init.headers },
      redirect: "error",
    })
  } catch {
    throw new ClinicGalleryCommandError("unavailable", "The gallery request outcome is unknown.")
  }
}

function mutationHeaders(contentType?: string) {
  const csrfToken = readBrowserCsrfToken(document.cookie)
  if (!csrfToken) throw new ClinicGalleryCommandError("forbidden", "Missing request verification.")
  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
  }
}

export function createClinicGalleryApiCommands(): ClinicGalleryCommands {
  const endpoint = "/api/dashboard/gallery"
  return {
    async discardDrafts(mediaIds) {
      const response = await request(`${endpoint}/discard`, {
        body: JSON.stringify({ mediaIds }),
        headers: mutationHeaders("application/json"),
        method: "POST",
      })
      if (!response.ok) throw errorForResponse(response, await response.json().catch(() => null))
    },
    async loadGallery(): Promise<ClinicGallerySnapshot> {
      return parseResponse(await request(endpoint), snapshotSchema)
    },
    async saveGallery(input): Promise<ClinicGallerySnapshot> {
      return parseResponse(
        await request(endpoint, {
          body: JSON.stringify(input),
          headers: mutationHeaders("application/json"),
          method: "PUT",
        }),
        snapshotSchema,
      )
    },
    async uploadMedia(input): Promise<ClinicGalleryMedia> {
      const body = new FormData()
      body.set("file", input.file)
      if (input.alt !== undefined) body.set("alt", input.alt)
      if (input.captionText !== undefined) body.set("captionText", input.captionText)
      return parseResponse(
        await request(`${endpoint}/media`, {
          body,
          headers: mutationHeaders(),
          method: "POST",
        }),
        mediaSchema,
      )
    },
  }
}
