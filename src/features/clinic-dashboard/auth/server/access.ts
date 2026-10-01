import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ClinicDashboardAccessResult } from "../model/auth"
import { fetchClinicDashboardBootstrap } from "./payload-bootstrap"
import { getClinicDashboardSession, readVerifiedSupabaseSession, type VerifiedClinicSession } from "./session"

export async function resolveAccessForSession(
  session: VerifiedClinicSession | undefined,
): Promise<ClinicDashboardAccessResult> {
  if (!session) return { status: "unauthenticated" }
  if (!session.isClinicAccount) return { status: "unauthorized" }

  const access = await fetchClinicDashboardBootstrap(session.accessToken)
  return access.status === "unauthorized" ? { status: "unauthenticated" } : access
}

export const getClinicDashboardAccess = cache(
  async (): Promise<ClinicDashboardAccessResult | Readonly<{ status: "recovery-required" }>> => {
    const cookieStore = await cookies()
    const session = await getClinicDashboardSession(cookieStore)
    if (!session) return { status: "unauthenticated" }
    if (!session.isClinicAccount) return { status: "unauthorized" }
    const access = await fetchClinicDashboardBootstrap(session.accessToken)
    return access.status === "unauthorized" ? { status: "recovery-required" } : access
  },
)

export const getClinicDashboardAccessToken = cache(async () => {
  try {
    const cookieStore = await cookies()
    const session = await getClinicDashboardSession(cookieStore)
    return session?.isClinicAccount ? session.accessToken : undefined
  } catch {
    return undefined
  }
})

export async function resolveMutableClinicDashboardAccess(
  client: SupabaseClient,
): Promise<ClinicDashboardAccessResult> {
  const session = await readVerifiedSupabaseSession(client)
  if (!session) return { status: "unauthenticated" }
  if (!session.isClinicAccount) return { status: "unauthorized" }

  const access = await fetchClinicDashboardBootstrap(session.accessToken)
  if (access.status !== "unauthorized") return access

  return refreshClinicDashboardAccess(client)
}

export async function refreshClinicDashboardAccess(
  client: SupabaseClient,
): Promise<ClinicDashboardAccessResult> {
  const { error } = await client.auth.refreshSession()
  if (error) {
    await client.auth.signOut({ scope: "local" }).catch(() => undefined)
    return { status: "unauthenticated" }
  }

  const session = await readVerifiedSupabaseSession(client)
  if (!session) {
    await client.auth.signOut({ scope: "local" }).catch(() => undefined)
    return { status: "unauthenticated" }
  }
  if (!session.isClinicAccount) return { status: "unauthorized" }

  const access = await fetchClinicDashboardBootstrap(session.accessToken)
  if (access.status === "unauthorized") {
    await client.auth.signOut({ scope: "local" }).catch(() => undefined)
    return { status: "unauthenticated" }
  }
  return access
}
