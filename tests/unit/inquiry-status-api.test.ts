// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { createInquiryStatusApiCommands } from "@/features/clinic-dashboard/messages/browser/inquiry-status-api"
import { inquiryQueueFixture } from "@/features/clinic-dashboard/messages/testing/public"
import { CLINIC_DASHBOARD_CSRF_COOKIE, CLINIC_DASHBOARD_CSRF_HEADER } from "@/lib/security/csrf-contract"

const inquiry = inquiryQueueFixture.inquiries[0]
if (!inquiry) throw new Error("The inquiry status API test requires an inquiry.")

function setCsrfCookie(value: string) {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=${encodeURIComponent(value)}; path=/`
}

function clearCsrfCookie() {
  document.cookie = `${CLINIC_DASHBOARD_CSRF_COOKIE}=; max-age=0; path=/`
}

function successResponse() {
  return new Response(
    JSON.stringify({
      changedAt: "11:08",
      inquiry: {
        ...inquiry,
        availableTransitions: ["contacted", "closed", "spam"],
        status: "in_review",
      },
    }),
    {
      headers: { "content-type": "application/json" },
      status: 200,
    },
  )
}

describe("Inquiry status browser API", () => {
  afterEach(() => {
    clearCsrfCookie()
    vi.unstubAllGlobals()
  })

  it("requires a CSRF cookie before issuing a request", async () => {
    const fetcher = vi.fn()
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createInquiryStatusApiCommands().updateStatus({
        inquiryId: inquiry.id,
        status: "in_review",
      }),
    ).rejects.toThrow("Missing request verification.")
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("encodes the inquiry id and sends a same-origin verified PATCH", async () => {
    setCsrfCookie("csrf token/value")
    const fetcher = vi.fn(async () => successResponse())
    vi.stubGlobal("fetch", fetcher)

    await expect(
      createInquiryStatusApiCommands().updateStatus({
        inquiryId: "inquiry/with space",
        status: "in_review",
      }),
    ).resolves.toMatchObject({
      changedAt: "11:08",
      inquiry: { status: "in_review" },
    })
    expect(fetcher).toHaveBeenCalledWith("/api/dashboard/inquiries/inquiry%2Fwith%20space/status", {
      body: '{"status":"in_review"}',
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        [CLINIC_DASHBOARD_CSRF_HEADER]: "csrf token/value",
      },
      method: "PATCH",
      redirect: "error",
    })
  })

  it.each([
    ["network failure", () => Promise.reject(new Error("offline"))],
    ["non-success response", () => Promise.resolve(new Response(null, { status: 409 }))],
  ])("fails closed for %s", async (_case, responseFactory) => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal("fetch", vi.fn(responseFactory))

    await expect(
      createInquiryStatusApiCommands().updateStatus({
        inquiryId: inquiry.id,
        status: "in_review",
      }),
    ).rejects.toThrow("Inquiry status update failed.")
  })

  it("rejects malformed success responses", async () => {
    setCsrfCookie("csrf-token")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ changedAt: "11:08" }), { status: 200 })),
    )

    await expect(
      createInquiryStatusApiCommands().updateStatus({
        inquiryId: inquiry.id,
        status: "in_review",
      }),
    ).rejects.toThrow("Inquiry status response was invalid.")
  })
})
