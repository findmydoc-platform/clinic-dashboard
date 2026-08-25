import { describe, expect, it } from "vitest"
import {
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  parseClinicDashboardReturnTarget,
  parseInquiryDeepLink,
} from "@/features/clinic-dashboard/public"

describe("inquiry deep link", () => {
  it("accepts one bounded opaque identifier", () => {
    expect(parseInquiryDeepLink("inquiry_01.Hair-Transplant~EU")).toBe("inquiry_01.Hair-Transplant~EU")
  })

  it("builds one canonical same-origin return target and login path", () => {
    const returnTarget = createClinicDashboardReturnTarget("inquiry_01.Hair-Transplant~EU")

    expect(returnTarget).toBe("/?inquiry=inquiry_01.Hair-Transplant~EU")
    expect(parseClinicDashboardReturnTarget(returnTarget)).toBe(returnTarget)
    expect(createClinicDashboardLoginPath(returnTarget)).toBe(
      "/login?next=%2F%3Finquiry%3Dinquiry_01.Hair-Transplant~EU",
    )
  })

  it.each([
    "//attacker.example",
    "https://attacker.example",
    "/?inquiry=inquiry-1&clinic=foreign",
    "/?clinic=foreign&inquiry=inquiry-1",
    "/?inquiry=inquiry%2F1",
    "/?inquiry=inquiry-1#fragment",
    "/?inquiry=inquiry-1\\redirect",
    `/\?inquiry=${"x".repeat(101)}`,
  ])("rejects a non-canonical return target: %s", (value) => {
    expect(parseClinicDashboardReturnTarget(value)).toBeUndefined()
  })

  it.each([
    undefined,
    "",
    " inquiry-1",
    "inquiry/1",
    "inquiry?clinic=other",
    ["inquiry-1", "inquiry-2"],
    "x".repeat(101),
  ])("rejects unsafe or ambiguous values: %j", (value) => {
    expect(parseInquiryDeepLink(value)).toBeUndefined()
  })
})
