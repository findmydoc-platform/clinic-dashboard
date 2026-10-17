import { describe, expect, it } from "vitest"
import { createInquiryAttachmentAccessPaths } from "@/features/clinic-dashboard/messages/browser/inquiry-attachment-paths"

describe("inquiry attachment browser paths", () => {
  it("derives only same-origin access paths from the opaque attachment id", () => {
    expect(createInquiryAttachmentAccessPaths("attachment~1/value", "clinic-1")).toEqual({
      download:
        "/api/dashboard/clinics/clinic-1/inquiries/attachments/download?attachmentId=attachment%7E1%2Fvalue",
      preview:
        "/api/dashboard/clinics/clinic-1/inquiries/attachments/preview?attachmentId=attachment%7E1%2Fvalue",
    })
  })
})
