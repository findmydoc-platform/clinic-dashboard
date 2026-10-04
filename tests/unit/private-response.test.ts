import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { createPrivateJsonResponse, readPrivateJson } from "@/lib/security/private-response"

describe("private response security module", () => {
  it("creates a private JSON response that varies by cookie", async () => {
    const response = createPrivateJsonResponse({ ok: true }, 201)

    expect(response.status).toBe(201)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(response.headers.get("Expires")).toBe("0")
    expect(response.headers.get("Pragma")).toBe("no-cache")
    expect(response.headers.get("Vary")).toBe("Cookie")
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it("reads a JSON body within the domain-defined byte limit", async () => {
    const request = new NextRequest("http://localhost:3000/api/dashboard/reviews", {
      body: JSON.stringify({ body: "Confirmed." }),
      method: "POST",
    })

    await expect(readPrivateJson(request, 1_024)).resolves.toEqual({ body: "Confirmed." })
  })

  it.each([
    ["malformed JSON", "{", 1_024],
    ["a body beyond its limit", JSON.stringify({ body: "too long" }), 8],
  ])("rejects %s", async (_description, body, maxBytes) => {
    const request = new NextRequest("http://localhost:3000/api/dashboard/reviews", {
      body,
      method: "POST",
    })

    await expect(readPrivateJson(request, maxBytes)).resolves.toBeNull()
  })

  it("can reject malformed UTF-8 when a domain requires strict decoding", async () => {
    const malformedUtf8Json = new Uint8Array([
      0x7b, 0x22, 0x6e, 0x61, 0x6d, 0x65, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d,
    ])
    const request = new NextRequest("http://localhost:3000/api/dashboard/profile/draft", {
      body: malformedUtf8Json,
      method: "POST",
    })

    await expect(readPrivateJson(request, 1_024, { fatalUtf8: true })).resolves.toBeNull()
  })
})
