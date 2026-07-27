import type { PatientInquiry, PatientInquiryStatus } from "./inquiries"

export type InquiryStatusCommands = Readonly<{
  updateStatus: (
    input: Readonly<{
      inquiryId: string
      status: PatientInquiryStatus
    }>,
  ) => Promise<
    Readonly<{
      changedAt: string
      inquiry: PatientInquiry
    }>
  >
}>
