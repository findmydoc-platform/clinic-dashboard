export const supportCategories = ["Technical issue", "Account access", "Profile or review", "Other"] as const
export const supportReplyChannels = ["Email", "Phone", "WhatsApp"] as const

export type SupportCategory = (typeof supportCategories)[number]
export type SupportReplyChannel = (typeof supportReplyChannels)[number]

export type SupportScreenshot = Readonly<{
  name: string
  size: number
  type: string
}>

export type SupportRequest = Readonly<{
  category: SupportCategory | ""
  message: string
  preferredReplyChannel: SupportReplyChannel
  screenshot?: SupportScreenshot
  subject: string
}>

export type SupportReceipt = Readonly<{
  expectedResponse: string
  ticketId: string
}>

type SupportRequestErrorFields = Partial<Record<"category" | "message" | "screenshot" | "subject", string>>

export type SupportRequestErrors = Readonly<SupportRequestErrorFields>

const maximumScreenshotBytes = 5 * 1024 * 1024

export function validateSupportRequest(request: SupportRequest): SupportRequestErrors {
  const errors: SupportRequestErrorFields = {}
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
