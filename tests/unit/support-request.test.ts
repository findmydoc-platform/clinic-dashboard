import { describe, expect, it } from "vitest"
import {
  createSupportRequestResult,
  emptySupportRequest,
  supportRequestPolicy,
  validateSupportRequest,
} from "@/features/clinic-dashboard/support/model/support-request"

describe("support request prototype contract", () => {
  it("allows only structured local fields and an Email reply-method label", () => {
    expect(Object.keys(emptySupportRequest).sort()).toEqual(["category", "message", "screenshot", "subject"])
    expect(supportRequestPolicy.replyMethodLabel).toBe("Email")
    expect(JSON.stringify(supportRequestPolicy)).not.toMatch(
      /phone|whatsapp|address|service hours|direct support|ticket|sla|business day/i,
    )
  })

  it("validates required fields and screenshot metadata locally", () => {
    expect(
      validateSupportRequest({
        category: "",
        message: "short",
        screenshot: { name: "notes.pdf", size: 6 * 1024 * 1024, type: "application/pdf" },
        subject: "Help",
      }),
    ).toEqual({
      category: "Choose a support category.",
      message: "Describe the issue using at least 20 characters.",
      screenshot: "Choose an image file.",
      subject: "Enter a subject with at least 5 characters.",
    })
  })

  it("creates only the honest local result without a ticket or response claim", () => {
    const result = createSupportRequestResult()

    expect(result).toEqual({
      message: "Prototype only — no request was sent.",
      status: "prototype-only",
    })
    expect(result).not.toHaveProperty("ticketId")
    expect(result).not.toHaveProperty("expectedResponse")
  })
})
