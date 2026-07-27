import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { resolveClinicDashboardMutationAccess } from "@/features/clinic-dashboard/auth/server/public"
import { isControlledAuthTestMode } from "@/lib/env"
import { validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import { isAllowedPatientInquiryStatusTransition, patientInquiryStatusValues } from "../model/inquiries"
import { updateControlledPatientInquiryStatus } from "./controlled-inquiries"
import {
  fetchPatientInquiry,
  isPatientInquiryPayloadError,
  updatePatientInquiryStatus,
} from "./payload-inquiries"

const inquiryIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u)
const statusUpdateSchema = z.object({ status: z.enum(patientInquiryStatusValues) }).strict()
const MAX_STATUS_REQUEST_BODY_BYTES = 4 * 1024

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}

async function readJson(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const parsedLength = Number(contentLength)
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAX_STATUS_REQUEST_BODY_BYTES
    ) {
      return null
    }
  }

  const body = await request.text().catch(() => "")
  if (!body || Buffer.byteLength(body, "utf8") > MAX_STATUS_REQUEST_BODY_BYTES) return null

  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

function accessErrorResponse(
  status: Exclude<Awaited<ReturnType<typeof resolveClinicDashboardMutationAccess>>["status"], "approved">,
) {
  if (status === "denied") return privateJson({ code: "INQUIRY_ACCESS_DENIED" }, 403)
  if (status === "temporarily-unavailable") {
    return privateJson({ code: "INQUIRY_SERVICE_UNAVAILABLE" }, 503)
  }
  return privateJson({ code: "INQUIRY_UNAUTHORIZED" }, 401)
}

function payloadErrorResponse(error: Error & Readonly<{ kind: string }>) {
  if (error.kind === "unauthorized") return privateJson({ code: "INQUIRY_UNAUTHORIZED" }, 401)
  if (error.kind === "forbidden") return privateJson({ code: "INQUIRY_ACCESS_DENIED" }, 403)
  if (error.kind === "not-found") return privateJson({ code: "INQUIRY_NOT_FOUND" }, 404)
  if (error.kind === "conflict") return privateJson({ code: "INQUIRY_STATUS_CONFLICT" }, 409)
  return privateJson({ code: "INQUIRY_SERVICE_UNAVAILABLE" }, 503)
}

export async function handlePatientInquiryStatusUpdate(request: NextRequest, inquiryIdValue: string) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const inquiryId = inquiryIdSchema.safeParse(inquiryIdValue)
  const input = statusUpdateSchema.safeParse(await readJson(request))
  if (!inquiryId.success || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    let result: Awaited<ReturnType<typeof updatePatientInquiryStatus>> | undefined
    if (isControlledAuthTestMode()) {
      result = updateControlledPatientInquiryStatus(inquiryId.data, input.data.status)
    } else {
      const currentInquiry = await fetchPatientInquiry(authorization.accessToken, inquiryId.data)
      result = isAllowedPatientInquiryStatusTransition(currentInquiry.status, input.data.status)
        ? await updatePatientInquiryStatus(authorization.accessToken, inquiryId.data, input.data.status)
        : undefined
    }
    const response = result ? privateJson(result) : privateJson({ code: "INQUIRY_STATUS_CONFLICT" }, 409)
    return authorization.applyToResponse(response)
  } catch (error) {
    const response = isPatientInquiryPayloadError(error)
      ? payloadErrorResponse(error)
      : privateJson({ code: "INQUIRY_SERVICE_UNAVAILABLE" }, 503)
    return authorization.applyToResponse(response)
  }
}
