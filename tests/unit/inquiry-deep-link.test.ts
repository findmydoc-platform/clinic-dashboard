import { describe, expect, it } from "vitest"
import { createClinicDashboardLoginPathForRequest } from "@/features/clinic-dashboard/auth/model/auth"
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
    [
      "/clinics/clinic-42?section=messages&inquiry=inquiry_01.Hair~EU",
      "/login?next=%2Fclinics%2Fclinic-42%3Fsection%3Dmessages%26inquiry%3Dinquiry_01.Hair~EU",
    ],
    [
      "/clinics/clinic-43?section=reviews&review=review-204",
      "/login?next=%2Fclinics%2Fclinic-43%3Fsection%3Dreviews%26review%3Dreview-204",
    ],
  ])("preserves only the exact internal clinic record target through login: %s", (target, login) => {
    expect(parseClinicDashboardReturnTarget(target)).toBe(target)
    const url = new URL(target, "http://localhost:3000")
    expect(
      createClinicDashboardLoginPathForRequest(
        url.pathname,
        url.searchParams.getAll("inquiry"),
        url.searchParams.getAll("section"),
        url.searchParams.getAll("review"),
      ),
    ).toBe(login)
  })

  it.each([
    [["messages"], ["review-1"], [], "/login?next=%2Fclinics%2Fclinic-42%3Fsection%3Dmessages"],
    [["reviews"], [], ["inquiry-1"], "/login?next=%2Fclinics%2Fclinic-42%3Fsection%3Dreviews"],
    [["reviews"], ["review-1", "review-2"], [], "/login?next=%2Fclinics%2Fclinic-42%3Fsection%3Dreviews"],
  ])("drops an ambiguous or mismatched exact target", (sections, reviews, inquiries, expected) => {
    expect(
      createClinicDashboardLoginPathForRequest(
        "/clinics/clinic-42",
        inquiries as string[],
        sections as string[],
        reviews as string[],
      ),
    ).toBe(expected)
  })

  it("does not retain record intent with unknown query keys", () => {
    expect(
      createClinicDashboardLoginPathForRequest(
        "/clinics/clinic-42",
        ["item"],
        ["messages"],
        [],
        ["section", "inquiry", "next"],
      ),
    ).toBe("/login?next=%2Fclinics%2Fclinic-42%3Fsection%3Dmessages")
  })

  it.each([
    "/clinics/clinic-42/inquiries/item?next=https://attacker.example",
    "/clinics/clinic-42/reviews/item#other",
    "/clinics/clinic-42/reviews/a%2Fb",
    "/clinics/../reviews/item",
    "/clinics/clinic-42/inquiries/..",
    "/clinics/clinic-42/other/item",
    "/clinics/clinic-42?section=reviews&inquiry=item",
    "/clinics/clinic-42?section=messages&inquiry=a&inquiry=b",
    "/clinics/clinic-42?section=reviews&review=item&next=https://attacker.example",
    "/clinics/clinic-42?section=messages&inquiry=..",
    "/clinics/..",
    "/clinics/.?section=messages",
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
