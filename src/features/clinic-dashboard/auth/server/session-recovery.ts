import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import { validateEnvironment } from "@/lib/env"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { isControlledAuthTestMode } from "@/lib/env"
import { getValidatedFormMutationOrigin } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import { createClinicDashboardLoginPath, parseClinicDashboardReturnTarget } from "../model/auth"
import { refreshClinicDashboardAccess, resolveAccessForSession } from "./access"
import {
  clearControlledSessionCookie,
  getClinicDashboardSession,
  readVerifiedSupabaseSession,
} from "./session"
import type { VerifiedClinicSession } from "./session"
import { clearDashboardAuthCookies, createRouteSupabaseClient } from "./supabase-client"

const recoverySchema = z
  .object({ attempt: z.string().max(128).optional(), csrf: z.string().min(1), mode: z.enum(["refresh", "clear"]), next: z.string().max(128) })
  .strict()
const MAX_BODY_BYTES = 8 * 1024

function signAttempt(session: VerifiedClinicSession, target: string, issuedAt: string) {
  return createHmac("sha256", validateEnvironment().CSRF_SIGNING_SECRET)
    .update(JSON.stringify(["session-recovery", session.subject, session.accessToken, target, issuedAt]))
    .digest("base64url")
}

function createAttempt(session: VerifiedClinicSession, target: string) {
  const issuedAt = String(Math.floor(Date.now() / 1000))
  return `${issuedAt}.${signAttempt(session, target, issuedAt)}`
}

function validAttempt(session: VerifiedClinicSession, target: string, attempt: string | undefined) {
  const [issuedAt, signature, extra] = (attempt ?? "").split(".")
  if (!issuedAt || !signature || extra) return false
  const age = Math.floor(Date.now() / 1000) - Number(issuedAt)
  if (!Number.isSafeInteger(Number(issuedAt)) || age < 0 || age > 300) return false
  const expected = Buffer.from(signAttempt(session, target, issuedAt))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function rejected(status: number) {
  const response = NextResponse.json(
    { code: status === 403 ? "REQUEST_REJECTED" : "INVALID_INPUT" },
    { status },
  )
  applyPrivateResponseHeaders(response.headers)
  return response
}

export async function handleClinicDashboardSessionRecovery(request: NextRequest) {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/x-www-form-urlencoded"
  )
    return rejected(403)
  const declaredSize = request.headers.get("content-length")
  if (declaredSize && (!/^\d+$/u.test(declaredSize) || Number(declaredSize) > MAX_BODY_BYTES))
    return rejected(400)
  const text = await request.text().catch(() => "")
  if (!text || Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return rejected(400)
  const fields = new URLSearchParams(text)
  if ([...fields.keys()].some((key) => fields.getAll(key).length !== 1)) return rejected(400)
  const parsed = recoverySchema.safeParse(Object.fromEntries(fields))
  if (!parsed.success) return rejected(400)
  const origin = getValidatedFormMutationOrigin(request, parsed.data.csrf)
  if (!origin) return rejected(403)
  const returnTarget = parseClinicDashboardReturnTarget(parsed.data.next)
  if (!returnTarget) return rejected(400)

  const controlled = isControlledAuthTestMode()
  const routeClient = controlled ? undefined : createRouteSupabaseClient(request)
  let access
  let completedAttempt: string | undefined
  try {
    const session = routeClient
      ? await readVerifiedSupabaseSession(routeClient.client)
      : await getClinicDashboardSession(request.cookies)
    const terminal = session && parsed.data.mode === "clear" && validAttempt(session, returnTarget, parsed.data.attempt)
    access = terminal
      ? { status: "unauthenticated" } as const
      : !session || !session.isClinicAccount || !routeClient
        ? await resolveAccessForSession(session)
        : await refreshClinicDashboardAccess(routeClient.client)
    if (access.status === "approved") {
      const renewed = routeClient ? await readVerifiedSupabaseSession(routeClient.client) : session
      if (renewed) completedAttempt = createAttempt(renewed, returnTarget)
      else access = { status: "unauthenticated" } as const
    }
  } catch {
    access = { status: "temporarily-unavailable" } as const
  }

  const destination =
    access.status === "approved"
      ? `${returnTarget}${returnTarget.includes("?") ? "&" : "?"}sessionRecovery=${completedAttempt}`
      : access.status === "denied"
        ? "/access"
        : access.status === "temporarily-unavailable"
          ? "/access?state=temporarily-unavailable"
          : createClinicDashboardLoginPath(returnTarget)
  let response = NextResponse.redirect(new URL(destination, origin), 303)
  if (access.status === "unauthenticated" || access.status === "unauthorized") {
    if (routeClient) await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
  }
  if (routeClient) response = routeClient.applyToResponse(response)
  if (access.status === "unauthenticated" || access.status === "unauthorized") {
    clearDashboardAuthCookies(request, response)
    if (controlled) clearControlledSessionCookie(response)
  }
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Vary", "Cookie")
  return response
}
