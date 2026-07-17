import { describe, expect, it } from "vitest"
import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"
import type { SupportCommands } from "@/features/clinic-dashboard/support/public"
import {
  validateSupportRequest,
  type SupportRequestErrors,
} from "@/features/clinic-dashboard/support/model/support-request"

type SupportRequestContract = Parameters<SupportCommands["submitSupportRequest"]>[0]
type SupportReceiptContract = Awaited<ReturnType<SupportCommands["submitSupportRequest"]>>

function assertReadonlyDomainContracts(
  profile: ClinicProfileDraft,
  request: SupportRequestContract,
  receipt: SupportReceiptContract,
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
  // @ts-expect-error Support receipts are readonly command results.
  receipt.ticketId = "FMD-0000"
  // @ts-expect-error Validation errors are readonly controller inputs.
  errors.subject = "Replaced outside the controller"
}

void assertReadonlyDomainContracts

describe("readonly domain contracts", () => {
  it("validates a frozen support request without mutating it", () => {
    const request = Object.freeze({
      category: "Technical issue",
      message: "The clinic dashboard does not load the profile overview.",
      preferredReplyChannel: "Email",
      subject: "Dashboard profile issue",
    }) satisfies SupportRequestContract

    expect(validateSupportRequest(request)).toEqual({})
    expect(request).toEqual({
      category: "Technical issue",
      message: "The clinic dashboard does not load the profile overview.",
      preferredReplyChannel: "Email",
      subject: "Dashboard profile issue",
    })
  })
})
