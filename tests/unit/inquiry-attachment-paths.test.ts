import { describe, expect, it } from "vitest"
import { createInquiryAttachmentAccessPaths } from "@/features/clinic-dashboard/messages/browser/inquiry-attachment-paths"

describe("inquiry attachment browser paths", () => {
  it("derives only same-origin access paths from the opaque attachment id", () => {
    expect(createInquiryAttachmentAccessPaths("attachment~1/value")).toEqual({
      download: "/api/dashboard/inquiries/attachments/download?attachmentId=attachment%7E1%2Fvalue",
      preview: "/api/dashboard/inquiries/attachments/preview?attachmentId=attachment%7E1%2Fvalue",
    })
  })
})
