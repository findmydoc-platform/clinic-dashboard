import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { resolveClinicDashboardMutationAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import { patientInquiryStatusValues } from "../model/inquiries"
import type { PatientInquiryChangeError, PatientInquiryProviderFactory } from "./patient-inquiry-provider"

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

function providerErrorResponse(error: PatientInquiryChangeError) {
  if (error === "unauthorized") return privateJson({ code: "INQUIRY_UNAUTHORIZED" }, 401)
  if (error === "forbidden") return privateJson({ code: "INQUIRY_ACCESS_DENIED" }, 403)
  if (error === "not-found") return privateJson({ code: "INQUIRY_NOT_FOUND" }, 404)
  if (error === "conflict") return privateJson({ code: "INQUIRY_STATUS_CONFLICT" }, 409)
  return privateJson({ code: "INQUIRY_SERVICE_UNAVAILABLE" }, 503)
}

export async function handlePatientInquiryStatusUpdate(
  request: NextRequest,
  inquiryIdValue: string,
  createProvider: PatientInquiryProviderFactory,
) {
  if (!validateMutationRequest(request)) return privateJson({ code: "REQUEST_REJECTED" }, 403)

  const inquiryId = inquiryIdSchema.safeParse(inquiryIdValue)
  const input = statusUpdateSchema.safeParse(await readJson(request))
  if (!inquiryId.success || !input.success) return privateJson({ code: "INVALID_INPUT" }, 400)

  const authorization = await resolveClinicDashboardMutationAccess(request)
  if (authorization.status !== "approved") {
    return authorization.applyToResponse(accessErrorResponse(authorization.status))
  }

  try {
    const result = await createProvider(authorization.accessToken, authorization.clinicId).changeStatus({
      inquiryId: inquiryId.data,
      status: input.data.status,
    })
    const response = result.ok ? privateJson(result.value) : providerErrorResponse(result.error)
    return authorization.applyToResponse(response)
  } catch {
    return authorization.applyToResponse(privateJson({ code: "INQUIRY_SERVICE_UNAVAILABLE" }, 503))
  }
}
