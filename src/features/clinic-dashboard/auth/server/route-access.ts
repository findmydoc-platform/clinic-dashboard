import "server-only"

import type { NextRequest, NextResponse } from "next/server"
import { isControlledAuthTestMode } from "@/lib/env"
import type { ClinicDashboardAccessResult, ClinicDashboardCapability } from "../model/auth"
import { resolveAccessForSession, resolveMutableClinicDashboardAccess } from "./access"
import { getClinicDashboardSession, readVerifiedSupabaseSession } from "./session"
import { createRouteSupabaseClient } from "./supabase-client"

type ClinicDashboardRouteAccess =
  | Readonly<{
      accessToken: string
      applyToResponse: (response: NextResponse) => NextResponse
      capabilities: readonly ClinicDashboardCapability[]
      clinicId: string
      status: "approved"
    }>
  | Readonly<{
      applyToResponse: (response: NextResponse) => NextResponse
      status: Exclude<ClinicDashboardAccessResult["status"], "approved">
    }>

export async function resolveClinicDashboardRouteAccess(
  request: NextRequest,
  requiredCapability?: ClinicDashboardCapability,
  targetClinicId?: string,
): Promise<ClinicDashboardRouteAccess> {
  const requestedClinicId =
    targetClinicId ??
    /^\/api\/dashboard\/clinics\/([A-Za-z0-9._~-]{1,100})\//u.exec(request.nextUrl.pathname)?.[1]
  if (isControlledAuthTestMode()) {
    const session = await getClinicDashboardSession(request.cookies)
    const access = await resolveAccessForSession(session)
    const applyToResponse = (response: NextResponse) => response

    if (access.status === "approved") {
      const clinic = access.context.clinics.find(({ id }) => id === requestedClinicId)
      if (!clinic || (requiredCapability && !clinic.capabilities.includes(requiredCapability))) {
        return { applyToResponse, status: "denied" }
      }
      return session
        ? {
            accessToken: session.accessToken,
            applyToResponse,
            capabilities: clinic.capabilities,
            clinicId: clinic.id,
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
  const clinic = access.context.clinics.find(({ id }) => id === requestedClinicId)
  if (!clinic || (requiredCapability && !clinic.capabilities.includes(requiredCapability))) {
    return { applyToResponse: routeClient.applyToResponse, status: "denied" }
  }

  const session = await readVerifiedSupabaseSession(routeClient.client)
  return session
    ? {
        accessToken: session.accessToken,
        applyToResponse: routeClient.applyToResponse,
        capabilities: clinic.capabilities,
        clinicId: clinic.id,
        status: "approved",
      }
    : { applyToResponse: routeClient.applyToResponse, status: "unauthenticated" }
}

export function resolveClinicDashboardMutationAccess(request: NextRequest) {
  return resolveClinicDashboardRouteAccess(request)
}

// Personal notification routes have no active-clinic target. Source visibility remains Website-owned.
export async function resolveClinicDashboardPersonalRouteAccess(request: NextRequest) {
  const controlled = isControlledAuthTestMode()
  const routeClient = controlled ? undefined : createRouteSupabaseClient(request)
  const applyToResponse = routeClient?.applyToResponse ?? ((response: NextResponse) => response)
  const access = controlled
    ? await resolveAccessForSession(await getClinicDashboardSession(request.cookies))
    : await resolveMutableClinicDashboardAccess(routeClient!.client)
  if (access.status !== "approved") return { applyToResponse, status: access.status } as const
  const session = controlled
    ? await getClinicDashboardSession(request.cookies)
    : await readVerifiedSupabaseSession(routeClient!.client)
  return session
    ? ({
        applyToResponse,
        status: "approved",
        accessToken: session.accessToken,
        principalId: access.context.principal.id,
        clinicIds: access.context.clinics.map(({ id }) => id),
      } as const)
    : ({ applyToResponse, status: "unauthenticated" } as const)
}
