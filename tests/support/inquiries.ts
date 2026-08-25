import type {
  PatientInquiry,
  PatientInquiryDetail,
  PatientInquiryQueueSnapshot,
} from "@/features/clinic-dashboard/messages/model/inquiries"

export function createInquiryDetail(overrides: Partial<PatientInquiryDetail> = {}): PatientInquiryDetail {
  return {
    actions: {
      canAddInternalNote: true,
      canChangeHandlingStatus: true,
      canChangeLifecycle: true,
      canMarkRead: true,
      canMarkUnread: false,
      canReply: true,
      canRevealContact: false,
    },
    changeCursor: "change-1",
    contact: { email: "patient@example.test", phone: "+49 000 0000000", state: "full" },
    contactWindow: "Weekdays",
    conversation: { id: "conversation-1", kind: "bound" },
    createdAt: "2026-08-24T08:00:00.000Z",
    handlingStatus: "submitted",
    id: "inquiry-1",
    interest: "Hair transplant",
    lastActivityAt: "2026-08-24T09:00:00.000Z",
    lastActivityLabel: "24 Aug, 11:00",
    lastActivityPreview: "Latest safe preview",
    latestActivityKind: "external-message",
    lifecycle: "open",
    originalRequest: "I would like an initial assessment.",
    originalRequestPreview: "I would like an initial assessment.",
    patient: { initials: "LW", kind: "verified", name: "Lukas Weber" },
    receivedLabel: "24 Aug, 10:00",
    revision: 1,
    timeline: [
      {
        author: { kind: "patient", label: "Patient" },
        body: "I would like an initial assessment.",
        createdAt: "2026-08-24T09:00:00.000Z",
        id: "activity-1",
        kind: "external-message",
        timeLabel: "24 Aug, 11:00",
      },
    ],
    treatmentTimeline: "Within three months",
    unread: { count: 1, isUnread: true },
    ...overrides,
  }
}

export function createInquirySnapshot(
  inquiries: readonly PatientInquiry[] = [createInquiryDetail()],
  overrides: Partial<Extract<PatientInquiryQueueSnapshot, { status: "ready" }>> = {},
): Extract<PatientInquiryQueueSnapshot, { status: "ready" }> {
  return {
    changeCursor: "queue-change-1",
    inquiries,
    status: "ready",
    unchanged: false,
    unreadCount: inquiries.reduce((total, inquiry) => total + (inquiry.unread.isUnread ? 1 : 0), 0),
    ...overrides,
  }
}
