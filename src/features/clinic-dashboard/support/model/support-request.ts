export const supportCategories = ["Technical issue", "Account access", "Profile or review", "Other"] as const
export const supportRequestPolicy = {
  replyMethodLabel: "Email",
  resultMessage: "Demo complete — no support request was sent or saved.",
} as const

export type SupportCategory = (typeof supportCategories)[number]

export type SupportScreenshot = Readonly<{
  name: string
  size: number
  type: string
}>

export type SupportRequest = Readonly<{
  category: SupportCategory | ""
  message: string
  screenshot?: SupportScreenshot
  subject: string
}>

export type SupportRequestResult = Readonly<{
  message: typeof supportRequestPolicy.resultMessage
  status: "demo-complete"
}>

type SupportRequestErrorFields = Partial<Record<"category" | "message" | "screenshot" | "subject", string>>

export type SupportRequestErrors = Readonly<SupportRequestErrorFields>

const maximumScreenshotBytes = 5 * 1024 * 1024

export const emptySupportRequest = {
  category: "",
  message: "",
  screenshot: undefined,
  subject: "",
} satisfies SupportRequest

export function createSupportRequestResult(): SupportRequestResult {
  return {
    message: supportRequestPolicy.resultMessage,
    status: "demo-complete",
  }
}

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
