"use client"

import { z } from "zod"
import { CLINIC_DASHBOARD_CSRF_HEADER, readBrowserCsrfToken } from "@/lib/security/csrf-contract"
import { patientInquiryStatusValues } from "../model/inquiries"
import type { InquiryStatusCommands } from "../model/inquiry-status-commands"

const patientInquiryStatusSchema = z.enum(patientInquiryStatusValues)
const patientInquirySchema = z.object({
  availableTransitions: z.array(patientInquiryStatusSchema),
  contactWindow: z.string(),
  createdAt: z.string(),
  dateLabel: z.string(),
  email: z.string(),
  id: z.string(),
  interest: z.string(),
  message: z.string(),
  name: z.string(),
  phone: z.string(),
  status: patientInquiryStatusSchema,
  timeLabel: z.string(),
  treatmentTimeline: z.string(),
})
const statusUpdateResponseSchema = z.object({
  changedAt: z.string(),
  inquiry: patientInquirySchema,
})

export function createInquiryStatusApiCommands(): InquiryStatusCommands {
  return {
    async updateStatus({ inquiryId, status }) {
      const csrfToken = readBrowserCsrfToken(document.cookie)
      if (!csrfToken) throw new Error("Missing request verification.")

      const response = await fetch(`/api/dashboard/inquiries/${encodeURIComponent(inquiryId)}/status`, {
        body: JSON.stringify({ status }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          [CLINIC_DASHBOARD_CSRF_HEADER]: csrfToken,
        },
        method: "PATCH",
        redirect: "error",
      }).catch(() => undefined)

      if (!response?.ok) throw new Error("Inquiry status update failed.")

      const parsed = statusUpdateResponseSchema.safeParse(await response.json().catch(() => null))
      if (!parsed.success) throw new Error("Inquiry status response was invalid.")

      return parsed.data
    },
  }
}
