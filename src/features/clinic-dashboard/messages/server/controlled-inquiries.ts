import "server-only"

import {
  getPatientInquiryStatusTransitions,
  isAllowedPatientInquiryStatusTransition,
  type PatientInquiry,
} from "../model/inquiries"
import type { PatientInquiryProvider } from "./patient-inquiry-provider"

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

export function createControlledPatientInquiryProvider(): PatientInquiryProvider {
  return {
    async changeStatus({ inquiryId, status }) {
      if (inquiryId !== controlledInquiry.id) {
        return { error: "not-found", ok: false }
      }
      if (!isAllowedPatientInquiryStatusTransition(controlledInquiry.status, status)) {
        return { error: "conflict", ok: false }
      }

      return {
        ok: true,
        value: {
          changedAt: "11:08",
          inquiry: {
            ...controlledInquiry,
            availableTransitions: getPatientInquiryStatusTransitions(status),
            status,
          },
        },
      }
    },
    async loadQueue() {
      return {
        ok: true,
        value: { inquiries: [{ ...controlledInquiry }], status: "ready" },
      }
    },
  }
}
