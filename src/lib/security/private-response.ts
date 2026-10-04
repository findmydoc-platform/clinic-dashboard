import { NextResponse } from "next/server"

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

export function createPrivateJsonResponse(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

export async function readPrivateJson(
  request: Request,
  maxBytes: number,
  options: Readonly<{ fatalUtf8?: boolean }> = {},
): Promise<unknown | null> {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const declaredBytes = Number(contentLength)
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0 || declaredBytes > maxBytes) return null
  }

  const reader = request.body?.getReader()
  if (!reader) return null

  const decoder = new TextDecoder("utf-8", { fatal: options.fatalUtf8 ?? false })
  let body = ""
  let receivedBytes = 0

  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      receivedBytes += chunk.value.byteLength
      if (receivedBytes > maxBytes) {
        await reader.cancel()
        return null
      }
      body += decoder.decode(chunk.value, { stream: true })
    }
    body += decoder.decode()
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }

  if (!body) return null

  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}
