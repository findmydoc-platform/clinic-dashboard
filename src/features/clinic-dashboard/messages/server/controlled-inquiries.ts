import "server-only"

import {
  getPatientInquiryStatusTransitions,
  isAllowedPatientInquiryStatusTransition,
  type PatientInquiry,
  type PatientInquiryQueueSnapshot,
  type PatientInquiryStatus,
} from "../model/inquiries"

const controlledInquiry = {
  availableTransitions: getPatientInquiryStatusTransitions("submitted"),
  contactWindow: "Weekdays after 16:00",
  createdAt: "2026-07-26T08:54:00.000Z",
  dateLabel: "26 July 2026",
  email: "l.weber@example.com",
  id: "inquiry-lukas-weber",
  interest: "Hair transplant",
  message: "I am interested in a hair transplant and would like to know which documents to prepare.",
  name: "Lukas Weber",
  phone: "+49 000 0000001",
  status: "submitted",
  timeLabel: "10:54",
  treatmentTimeline: "Within 3–6 months",
} as const satisfies PatientInquiry

export function getControlledPatientInquiryQueue(): PatientInquiryQueueSnapshot {
  return { inquiries: [{ ...controlledInquiry }], status: "ready" }
}

export function updateControlledPatientInquiryStatus(
  inquiryId: string,
  status: PatientInquiryStatus,
): Readonly<{ changedAt: string; inquiry: PatientInquiry }> | undefined {
  if (
    inquiryId !== controlledInquiry.id ||
    !isAllowedPatientInquiryStatusTransition(controlledInquiry.status, status)
  ) {
    return undefined
  }

  return {
    changedAt: "11:08",
    inquiry: {
      ...controlledInquiry,
      availableTransitions: getPatientInquiryStatusTransitions(status),
      status,
    },
  }
}
