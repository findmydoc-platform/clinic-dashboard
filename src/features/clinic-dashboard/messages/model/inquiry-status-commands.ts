import type { PatientInquiryStatus, PatientInquiryStatusUpdate } from "./inquiries"

export type InquiryStatusCommands = Readonly<{
  updateStatus: (
    input: Readonly<{
      inquiryId: string
      status: PatientInquiryStatus
    }>,
  ) => Promise<PatientInquiryStatusUpdate>
}>
