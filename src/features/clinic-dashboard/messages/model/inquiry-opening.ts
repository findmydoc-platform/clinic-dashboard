export type InquiryOpeningRequest = Readonly<{
  requestId: string
  inquiryId: string
  anchor?: Readonly<{ kind: "message" | "appeal" | "occurrence"; id: string }>
}>

export type InquiryOpeningResult = Readonly<{
  requestId: string
  inquiryId: string
  status: "displayed" | "unavailable" | "cancelled"
}>
