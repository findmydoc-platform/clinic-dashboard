import { matchRemotePattern } from "next/dist/shared/lib/match-remote-pattern"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createClinicManagedMediaImageConfig,
  createClinicManagedMediaRemotePatterns,
} from "@/lib/clinic-managed-media-image-config"

const clinicManagedMediaPathnames = [
  "/api/clinicMedia/file/**",
  "/api/doctorMedia/file/**",
  "/api/userProfileMedia/file/**",
]

describe("clinic-managed media image configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each([
    ["Preview", "https://preview.findmydoc.eu", "https", "preview.findmydoc.eu", ""],
    ["Production", "https://findmydoc.eu", "https", "findmydoc.eu", ""],
    ["local development", "http://127.0.0.1:3000", "http", "127.0.0.1", "3000"],
  ])("creates a strict %s remote pattern from PAYLOAD_API_URL", (_name, value, protocol, hostname, port) => {
    const patterns = createClinicManagedMediaRemotePatterns(value)

    expect(patterns).toEqual(
      clinicManagedMediaPathnames.map((pathname) => ({
        protocol,
        hostname,
        port,
        pathname,
      })),
    )
    expect(patterns.every((pattern) => !("search" in pattern))).toBe(true)
  })

  it("fails closed when PAYLOAD_API_URL is missing", () => {
    expect(createClinicManagedMediaRemotePatterns(undefined)).toEqual([])
    expect(createClinicManagedMediaImageConfig(undefined)).toEqual({
      dangerouslyAllowLocalIP: false,
      remotePatterns: [],
    })
    expect(createClinicManagedMediaImageConfig("")).toEqual({
      dangerouslyAllowLocalIP: false,
      remotePatterns: [],
    })
  })

  it("rejects non-HTTP origins and embedded credentials", () => {
    expect(() => createClinicManagedMediaRemotePatterns("ftp://findmydoc.eu")).toThrow(
      "PAYLOAD_API_URL must use HTTP or HTTPS",
    )
    expect(
      () => createClinicManagedMediaRemotePatterns("https://user:secret@findmydoc.eu"), // pragma: allowlist secret
    ).toThrow("PAYLOAD_API_URL must not contain credentials")
  })

  it.each([
    ["localhost", "http://localhost:3000", true],
    ["IPv4 loopback", "http://127.0.0.1:3000", true],
    ["IPv6 loopback", "http://[::1]:3000", true],
    ["Preview", "https://preview.findmydoc.eu", false],
    ["Production", "https://findmydoc.eu", false],
  ])("allows private image fetching only for an explicit %s origin", (_name, value, expected) => {
    expect(createClinicManagedMediaImageConfig(value).dangerouslyAllowLocalIP).toBe(expected)
  })

  it("wires the generated image policy into the effective Next.js configuration", async () => {
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.resetModules()

    const { default: nextConfig } = await import("../../next.config")

    expect(nextConfig.images).toEqual(createClinicManagedMediaImageConfig("https://preview.findmydoc.eu"))
  })

  it("matches every active clinic-managed media route on the configured origin", () => {
    const patterns = createClinicManagedMediaRemotePatterns("https://preview.findmydoc.eu")

    for (const allowedUrl of [
      "https://preview.findmydoc.eu/api/clinicMedia/file/clinic.png?prefix=clinics&v=2",
      "https://preview.findmydoc.eu/api/doctorMedia/file/portrait.png?prefix=doctors&v=2",
      "https://preview.findmydoc.eu/api/userProfileMedia/file/avatar.png?prefix=users&v=2",
    ]) {
      expect(patterns.some((pattern) => matchRemotePattern(pattern, new URL(allowedUrl)))).toBe(true)
    }
  })

  it("blocks other origins and inactive or platform-owned media routes", () => {
    const patterns = createClinicManagedMediaRemotePatterns("https://preview.findmydoc.eu")

    for (const blockedUrl of [
      "https://findmydoc.eu/api/doctorMedia/file/portrait.png",
      "http://preview.findmydoc.eu/api/doctorMedia/file/portrait.png",
      "https://preview.findmydoc.eu:444/api/doctorMedia/file/portrait.png",
      "https://preview.findmydoc.eu/api/clinicGalleryMedia/file/gallery.png",
      "https://preview.findmydoc.eu/api/platformContentMedia/file/content.png",
      "https://preview.findmydoc.eu/api/doctorMedia/portrait.png",
    ]) {
      expect(patterns.some((pattern) => matchRemotePattern(pattern, new URL(blockedUrl)))).toBe(false)
    }
  })
})
