export type DoctorMediaRemotePattern = {
  protocol: "http" | "https"
  hostname: string
  port: string
  pathname: "/api/doctorMedia/file/**"
}

export type DoctorMediaImageConfig = {
  dangerouslyAllowLocalIP: boolean
  remotePatterns: DoctorMediaRemotePattern[]
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

export function createDoctorMediaRemotePatterns(
  payloadApiUrl: string | undefined = process.env.PAYLOAD_API_URL,
): DoctorMediaRemotePattern[] {
  if (!payloadApiUrl) return []

  const url = new URL(payloadApiUrl)
  const protocol = url.protocol.replace(/:$/, "")

  if (protocol !== "http" && protocol !== "https") {
    throw new Error("PAYLOAD_API_URL must use HTTP or HTTPS for remote doctor images")
  }
  if (url.username || url.password) {
    throw new Error("PAYLOAD_API_URL must not contain credentials")
  }

  return [
    {
      protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: "/api/doctorMedia/file/**",
    },
  ]
}

export function createDoctorMediaImageConfig(
  payloadApiUrl: string | undefined = process.env.PAYLOAD_API_URL,
): DoctorMediaImageConfig {
  const remotePatterns = createDoctorMediaRemotePatterns(payloadApiUrl)

  return {
    dangerouslyAllowLocalIP:
      payloadApiUrl !== undefined && isLoopbackHostname(new URL(payloadApiUrl).hostname),
    remotePatterns,
  }
}
