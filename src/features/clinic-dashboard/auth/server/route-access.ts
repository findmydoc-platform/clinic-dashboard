import "server-only"

import type { NextRequest, NextResponse } from "next/server"
import { isControlledAuthTestMode } from "@/lib/env"
import type { ClinicDashboardAccessResult } from "../model/auth"
import { resolveAccessForSession, resolveMutableClinicDashboardAccess } from "./access"
import { getClinicDashboardSession, readVerifiedSupabaseSession } from "./session"
import { createRouteSupabaseClient } from "./supabase-client"

type ClinicDashboardMutationAccess =
  | Readonly<{
      accessToken: string
      applyToResponse: (response: NextResponse) => NextResponse
      clinicId: string
      status: "approved"
    }>
  | Readonly<{
      applyToResponse: (response: NextResponse) => NextResponse
      status: Exclude<ClinicDashboardAccessResult["status"], "approved">
    }>

export async function resolveClinicDashboardMutationAccess(
  request: NextRequest,
): Promise<ClinicDashboardMutationAccess> {
  if (isControlledAuthTestMode()) {
    const session = await getClinicDashboardSession(request.cookies)
    const access = await resolveAccessForSession(session)
    const applyToResponse = (response: NextResponse) => response

    if (access.status === "approved") {
      return session
        ? {
            accessToken: session.accessToken,
            applyToResponse,
            clinicId: access.context.clinic.id,
            status: "approved",
          }
        : { applyToResponse, status: "unauthenticated" }
    }

    return { applyToResponse, status: access.status }
  }

  const routeClient = createRouteSupabaseClient(request)
  const access = await resolveMutableClinicDashboardAccess(routeClient.client)
  if (access.status !== "approved") {
    return { applyToResponse: routeClient.applyToResponse, status: access.status }
  }

  const session = await readVerifiedSupabaseSession(routeClient.client)
  return session
    ? {
        accessToken: session.accessToken,
        applyToResponse: routeClient.applyToResponse,
        clinicId: access.context.clinic.id,
        status: "approved",
      }
    : { applyToResponse: routeClient.applyToResponse, status: "unauthenticated" }
}
