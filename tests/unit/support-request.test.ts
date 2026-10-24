import { describe, expect, it } from "vitest"
import { validateSupportRequest } from "@/features/clinic-dashboard/support/model/support-request"
describe("support request bounds", () => {
  it("accepts an ordinary request", () => {
    expect(
      validateSupportRequest({
        subject: "Profile update failed",
        message: "The clinic profile fails to save the changes.",
      }),
    ).toEqual({})
  })
  it.each(["Short", "x".repeat(161), "Injected\r\nBcc: stranger@example.com"])(
    "rejects invalid subject %s",
    (subject) => {
      expect(
        validateSupportRequest({
          subject: subject === "Short" ? "x" : subject,
          message: "The clinic profile fails to save the changes.",
        }).subject,
      ).toBeDefined()
    },
  )
})
