export type InquiryOpeningRequest = Readonly<{
  clinicId?: string
  requestId: string
  inquiryId: string
  anchor?: Readonly<{ kind: "message" | "appeal" | "occurrence"; id: string }>
}>

export type InquiryOpeningResult = Readonly<{
  clinicId?: string
  requestId: string
  inquiryId: string
  status: "displayed" | "unavailable" | "cancelled"
}>
