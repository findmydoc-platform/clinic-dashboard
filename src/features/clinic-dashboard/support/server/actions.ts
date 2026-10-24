import "server-only"
import type { NextRequest } from "next/server"
import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/public"
import { validateMutationRequest } from "@/lib/security/csrf"
import { createPrivateJsonResponse as json, readPrivateJson } from "@/lib/security/private-response"
import { supportRequestSchema } from "../model/support-request"
import { sendWorkspaceSupport } from "./workspace-smtp"

export async function handleSupportSubmit(request: NextRequest) {
  if (!validateMutationRequest(request)) return json({ status: "failed" }, 403)
  const access = await resolveClinicDashboardRouteAccess(request).catch(() => null)
  if (!access) return json({ status: "failed" }, 503)
  if (access.status !== "approved")
    return access.applyToResponse(
      json(
        { status: "failed" },
        access.status === "denied" ? 403 : access.status === "temporarily-unavailable" ? 503 : 401,
      ),
    )
  const input = supportRequestSchema.safeParse(await readPrivateJson(request, 24 * 1024, { fatalUtf8: true }))
  if (!input.success) return access.applyToResponse(json({ status: "failed" }, 400))
  const result = await sendWorkspaceSupport({
    ...input.data,
    clinicId: access.clinicId,
    clinicName: access.clinicName,
    replyEmail: access.replyEmail,
  })
  return access.applyToResponse(json(result, result.status === "accepted" ? 200 : 502))
}
