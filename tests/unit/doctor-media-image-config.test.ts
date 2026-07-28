import { matchRemotePattern } from "next/dist/shared/lib/match-remote-pattern"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createDoctorMediaImageConfig,
  createDoctorMediaRemotePatterns,
} from "@/lib/doctor-media-image-config"

describe("doctor media image configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each([
    ["Preview", "https://preview.findmydoc.eu", "https", "preview.findmydoc.eu", ""],
    ["Production", "https://findmydoc.eu", "https", "findmydoc.eu", ""],
    ["local development", "http://127.0.0.1:3000", "http", "127.0.0.1", "3000"],
  ])("creates a strict %s remote pattern from PAYLOAD_API_URL", (_name, value, protocol, hostname, port) => {
    const patterns = createDoctorMediaRemotePatterns(value)

    expect(patterns).toEqual([
      {
        protocol,
        hostname,
        port,
        pathname: "/api/doctorMedia/file/**",
      },
    ])
    expect(patterns[0]).not.toHaveProperty("search")
  })

  it("fails closed when PAYLOAD_API_URL is missing", () => {
    expect(createDoctorMediaRemotePatterns(undefined)).toEqual([])
    expect(createDoctorMediaImageConfig(undefined)).toEqual({
      dangerouslyAllowLocalIP: false,
      remotePatterns: [],
    })
  })

  it("rejects non-HTTP origins and embedded credentials", () => {
    expect(() => createDoctorMediaRemotePatterns("ftp://findmydoc.eu")).toThrow(
      "PAYLOAD_API_URL must use HTTP or HTTPS",
    )
    expect(() => createDoctorMediaRemotePatterns("https://user:secret@findmydoc.eu")).toThrow(
      "PAYLOAD_API_URL must not contain credentials",
    )
  })

  it.each([
    ["localhost", "http://localhost:3000", true],
    ["IPv4 loopback", "http://127.0.0.1:3000", true],
    ["IPv6 loopback", "http://[::1]:3000", true],
    ["Preview", "https://preview.findmydoc.eu", false],
    ["Production", "https://findmydoc.eu", false],
  ])("allows private image fetching only for an explicit %s origin", (_name, value, expected) => {
    expect(createDoctorMediaImageConfig(value).dangerouslyAllowLocalIP).toBe(expected)
  })

  it("wires the generated image policy into the effective Next.js configuration", async () => {
    vi.stubEnv("PAYLOAD_API_URL", "https://preview.findmydoc.eu")
    vi.resetModules()

    const { default: nextConfig } = await import("../../next.config")

    expect(nextConfig.images).toEqual(createDoctorMediaImageConfig("https://preview.findmydoc.eu"))
  })

  it("matches only doctor-media URLs on the configured origin and port", () => {
    const [pattern] = createDoctorMediaRemotePatterns("https://preview.findmydoc.eu")

    expect(
      matchRemotePattern(
        pattern,
        new URL("https://preview.findmydoc.eu/api/doctorMedia/file/portrait.png?prefix=doctors&v=2"),
      ),
    ).toBe(true)

    for (const blockedUrl of [
      "https://findmydoc.eu/api/doctorMedia/file/portrait.png",
      "http://preview.findmydoc.eu/api/doctorMedia/file/portrait.png",
      "https://preview.findmydoc.eu:444/api/doctorMedia/file/portrait.png",
      "https://preview.findmydoc.eu/api/clinicMedia/file/portrait.png",
      "https://preview.findmydoc.eu/api/doctorMedia/portrait.png",
    ]) {
      expect(matchRemotePattern(pattern, new URL(blockedUrl))).toBe(false)
    }
  })
})
