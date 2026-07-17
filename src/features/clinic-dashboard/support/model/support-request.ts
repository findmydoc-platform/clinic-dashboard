export const supportCategories = ["Technical issue", "Account access", "Profile or review", "Other"] as const
export const supportReplyChannels = ["Email", "Phone", "WhatsApp"] as const

export type SupportCategory = (typeof supportCategories)[number]
export type SupportReplyChannel = (typeof supportReplyChannels)[number]

export type SupportScreenshot = {
  name: string
  size: number
  type: string
}

export type SupportRequest = {
  category: SupportCategory | ""
  message: string
  preferredReplyChannel: SupportReplyChannel
  screenshot?: SupportScreenshot
  subject: string
}

export type SupportReceipt = {
  expectedResponse: string
  ticketId: string
}

export type SupportRequestErrors = Partial<Record<"category" | "message" | "screenshot" | "subject", string>>

const maximumScreenshotBytes = 5 * 1024 * 1024

export function validateSupportRequest(request: SupportRequest): SupportRequestErrors {
  const errors: SupportRequestErrors = {}
  if (!request.category) errors.category = "Choose a support category."
  if (request.subject.trim().length < 5) errors.subject = "Enter a subject with at least 5 characters."
  if (request.message.trim().length < 20) {
    errors.message = "Describe the issue using at least 20 characters."
  }
  if (request.screenshot && !request.screenshot.type.startsWith("image/")) {
    errors.screenshot = "Choose an image file."
  } else if (request.screenshot && request.screenshot.size > maximumScreenshotBytes) {
    errors.screenshot = "The screenshot must be 5 MB or smaller."
  }
  return errors
}
