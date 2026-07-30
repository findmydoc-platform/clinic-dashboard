import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextResponse } from "next/server"
import { isControlledAuthTestMode } from "@/lib/env"
import { createReadOnlySupabaseClient } from "./supabase-client"

const CONTROLLED_SESSION_COOKIE = "clinic_dashboard_controlled_session"
const CONTROLLED_SESSION_VALUE = "controlled-clinic-staff"

type CookieSource = Readonly<{
  get: (name: string) => Readonly<{ value: string }> | undefined
  getAll: () => readonly Readonly<{ name: string; value: string }>[]
}>

export type VerifiedClinicSession = Readonly<{
  accessToken: string
  email: string
  isClinicAccount: boolean
  subject: string
}>

function readUserType(claims: Record<string, unknown>) {
  const appMetadata = claims.app_metadata
  if (!appMetadata || typeof appMetadata !== "object" || !("user_type" in appMetadata)) return undefined
  return typeof appMetadata.user_type === "string" ? appMetadata.user_type : undefined
}

export async function readVerifiedSupabaseSession(
  client: SupabaseClient,
): Promise<VerifiedClinicSession | undefined> {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims()
  const claims = claimsData?.claims as Record<string, unknown> | undefined
  if (claimsError || !claims || typeof claims.sub !== "string" || typeof claims.email !== "string") {
    return undefined
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (sessionError || !accessToken) return undefined

  return {
    accessToken,
    email: claims.email,
    isClinicAccount: readUserType(claims) === "clinic",
    subject: claims.sub,
  }
}

export async function getClinicDashboardSession(
  cookieSource: CookieSource,
): Promise<VerifiedClinicSession | undefined> {
  if (isControlledAuthTestMode()) {
    return cookieSource.get(CONTROLLED_SESSION_COOKIE)?.value === CONTROLLED_SESSION_VALUE
      ? {
          accessToken:
            cookieSource.get("clinic_dashboard_controlled_access_state")?.value === "denied"
              ? "controlled-denied"
              : cookieSource.get("clinic_dashboard_controlled_access_state")?.value === "outage"
                ? "controlled-outage"
                : "controlled-access-token",
          email: "clinic-staff@example.com",
          isClinicAccount: true,
          subject: "controlled-clinic-staff",
        }
      : undefined
  }

  return readVerifiedSupabaseSession(createReadOnlySupabaseClient(cookieSource))
}

export function setControlledSessionCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    name: CONTROLLED_SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: false,
    value: CONTROLLED_SESSION_VALUE,
  })
}

export function clearControlledSessionCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: CONTROLLED_SESSION_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: false,
    value: "",
  })
}

export function hasControlledSession(cookieSource: Pick<CookieSource, "get">) {
  return (
    isControlledAuthTestMode() &&
    cookieSource.get(CONTROLLED_SESSION_COOKIE)?.value === CONTROLLED_SESSION_VALUE
  )
}
