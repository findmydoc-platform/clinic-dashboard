export const patientInquiryStatusValues = ["submitted", "in_review", "contacted", "closed", "spam"] as const

export type PatientInquiryStatus = (typeof patientInquiryStatusValues)[number]

const patientInquiryStatusLabels = {
  closed: "Closed",
  contacted: "Contacted",
  in_review: "In review",
  spam: "Spam",
  submitted: "Submitted",
} as const satisfies Record<PatientInquiryStatus, string>

const patientInquiryStatusTransitions = {
  closed: [],
  contacted: ["closed"],
  in_review: ["contacted", "closed", "spam"],
  spam: [],
  submitted: ["in_review", "contacted", "closed", "spam"],
} as const satisfies Record<PatientInquiryStatus, readonly PatientInquiryStatus[]>

export type PatientInquiry = Readonly<{
  availableTransitions: readonly PatientInquiryStatus[]
  contactWindow: string
  createdAt: string
  dateLabel: string
  email: string
  id: string
  interest: string
  message: string
  name: string
  phone: string
  status: PatientInquiryStatus
  timeLabel: string
  treatmentTimeline: string
}>

export type PatientInquiryStatusUpdate = Readonly<{
  changedAt: string
  inquiry: PatientInquiry
}>

export type PatientInquiryQueueSnapshot =
  | Readonly<{
      inquiries: readonly PatientInquiry[]
      status: "ready"
    }>
  | Readonly<{
      inquiries: readonly []
      status: "temporarily-unavailable"
    }>

export type PatientInquiryStatusEvent = Readonly<{
  changedAt: string
  from: PatientInquiryStatus
  id: string
  inquiryId: string
  to: PatientInquiryStatus
}>

export type PatientInquiryListItemModel = Readonly<{
  inquiry: PatientInquiry
  isActive: boolean
}>

export type InquiryQueueViewModel = Readonly<{
  availability: PatientInquiryQueueSnapshot["status"]
  isStatusChangeDisabled: boolean
  isStatusMenuOpen: boolean
  isUpdatingStatus: boolean
  mobileInquiryOpen: boolean
  newInquiryCount: number
  searchQuery: string
  selectedInquiry?: PatientInquiry
  selectedStatusEvents: readonly PatientInquiryStatusEvent[]
  statusError?: string
  statusMessage: string
  totalInquiryCount: number
  visibleInquiries: readonly PatientInquiryListItemModel[]
}>

export type InquiryQueueActions = Readonly<{
  onInquirySelect: (inquiryId: string) => void
  onMobileBack: () => void
  onSearchQueryChange: (query: string) => void
  onStatusChange: (status: PatientInquiryStatus) => Promise<void>
  onStatusMenuOpenChange: (open: boolean) => void
}>

export function getPatientInquiryStatusLabel(status: PatientInquiryStatus) {
  return patientInquiryStatusLabels[status]
}

export function getPatientInquiryStatusTransitions(status: PatientInquiryStatus) {
  return patientInquiryStatusTransitions[status]
}

export function isAllowedPatientInquiryStatusTransition(
  currentStatus: PatientInquiryStatus,
  nextStatus: PatientInquiryStatus,
) {
  return patientInquiryStatusTransitions[currentStatus].includes(nextStatus as never)
}

export function filterPatientInquiries(inquiries: readonly PatientInquiry[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("en")
  if (!normalizedQuery) return [...inquiries]

  return inquiries.filter((inquiry) =>
    [
      inquiry.contactWindow,
      inquiry.email,
      inquiry.interest,
      inquiry.message,
      inquiry.name,
      inquiry.phone,
      inquiry.treatmentTimeline,
    ]
      .join(" ")
      .toLocaleLowerCase("en")
      .includes(normalizedQuery),
  )
}
