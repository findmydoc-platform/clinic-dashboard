import { describe, expect, it } from "vitest"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"
import {
  validateSupportRequest,
  type SupportRequest,
  type SupportRequestErrors,
  type SupportRequestResult,
} from "@/features/clinic-dashboard/support/model/support-request"

function assertReadonlyDomainContracts(
  profile: ClinicProfileDraft,
  request: SupportRequest,
  result: SupportRequestResult,
  errors: SupportRequestErrors,
) {
  // @ts-expect-error The exported profile root is readonly.
  profile.name = "Changed outside the reducer"
  // @ts-expect-error Nested profile objects are readonly.
  profile.address.city = "Hamburg"
  // @ts-expect-error Profile collections expose readonly arrays.
  profile.gallery.push(profile.gallery[0]!)
  // @ts-expect-error Profile collection items are readonly.
  profile.team[0]!.name = "Changed outside the reducer"
  // @ts-expect-error Support requests are readonly command inputs.
  request.subject = "Changed outside the controller"
  // @ts-expect-error Nested support request objects are readonly.
  request.screenshot!.name = "replacement.png"
  // @ts-expect-error Support result state is readonly.
  result.message = "Changed outside the controller"
  // @ts-expect-error Validation errors are readonly controller inputs.
  errors.subject = "Replaced outside the controller"
}

void assertReadonlyDomainContracts

describe("readonly domain contracts", () => {
  it("validates a frozen support request without mutating it", () => {
    const request = Object.freeze({
      category: "Technical issue",
      message: "The clinic dashboard does not load the profile overview.",
      subject: "Dashboard profile issue",
    }) satisfies SupportRequest

    expect(validateSupportRequest(request)).toEqual({})
    expect(request).toEqual({
      category: "Technical issue",
      message: "The clinic dashboard does not load the profile overview.",
      subject: "Dashboard profile issue",
    })
  })
})
