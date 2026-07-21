const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Expires: "0",
  Pragma: "no-cache",
} as const

export function applyPrivateResponseHeaders(headers: Headers) {
  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    headers.set(name, value)
  }

  return headers
}
