import { z } from "zod"

export const supportRequestSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(5)
      .max(160)
      .regex(/^[^\r\n\x00-\x1f\x7f]*$/u),
    message: z
      .string()
      .trim()
      .min(20)
      .max(5_000)
      .refine((value) => !value.includes("\0")),
  })
  .strict()
export type SupportRequest = Readonly<z.infer<typeof supportRequestSchema>>
export type SupportRequestResult = Readonly<{ status: "accepted" | "failed" | "unknown" }>
export type SupportCommand = (request: SupportRequest) => Promise<SupportRequestResult>
export type SupportRequestErrors = Readonly<Partial<Record<keyof SupportRequest, string>>>
export const emptySupportRequest: SupportRequest = { subject: "", message: "" }
export function validateSupportRequest(request: SupportRequest): SupportRequestErrors {
  const parsed = supportRequestSchema.safeParse(request)
  if (parsed.success) return {}
  const errors: Partial<Record<keyof SupportRequest, string>> = {}
  for (const issue of parsed.error.issues) {
    if (issue.path[0] === "subject") errors.subject = "Enter a subject with 5–160 characters on one line."
    if (issue.path[0] === "message") errors.message = "Describe the issue using 20–5,000 characters."
  }
  return errors
}
