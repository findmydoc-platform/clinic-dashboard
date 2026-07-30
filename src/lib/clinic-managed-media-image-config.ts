const clinicManagedMediaPathnames = [
  "/api/clinicMedia/file/**",
  "/api/doctorMedia/file/**",
  "/api/userProfileMedia/file/**",
] as const

export type ClinicManagedMediaRemotePattern = {
  protocol: "http" | "https"
  hostname: string
  port: string
  pathname: (typeof clinicManagedMediaPathnames)[number]
}

export type ClinicManagedMediaImageConfig = {
  dangerouslyAllowLocalIP: boolean
  remotePatterns: ClinicManagedMediaRemotePattern[]
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

export function createClinicManagedMediaRemotePatterns(
  payloadApiUrl: string | undefined = process.env.PAYLOAD_API_URL,
): ClinicManagedMediaRemotePattern[] {
  if (!payloadApiUrl) return []

  const url = new URL(payloadApiUrl)
  const protocol = url.protocol.replace(/:$/, "")

  if (protocol !== "http" && protocol !== "https") {
    throw new Error("PAYLOAD_API_URL must use HTTP or HTTPS for remote clinic-managed images")
  }
  if (url.username || url.password) {
    throw new Error("PAYLOAD_API_URL must not contain credentials")
  }

  return clinicManagedMediaPathnames.map((pathname) => ({
    protocol,
    hostname: url.hostname,
    port: url.port,
    pathname,
  }))
}

export function createClinicManagedMediaImageConfig(
  payloadApiUrl: string | undefined = process.env.PAYLOAD_API_URL,
): ClinicManagedMediaImageConfig {
  const remotePatterns = createClinicManagedMediaRemotePatterns(payloadApiUrl)

  return {
    dangerouslyAllowLocalIP: payloadApiUrl ? isLoopbackHostname(new URL(payloadApiUrl).hostname) : false,
    remotePatterns,
  }
}
