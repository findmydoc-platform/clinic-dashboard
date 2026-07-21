import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import type { NextResponse } from "next/server"
import { isSecureCookieEnvironment, validateEnvironment } from "@/lib/env"
import { clinicDashboardEmailDestinations, type ClinicDashboardEmailFlow } from "../model/auth"

export const clinicDashboardPendingEmailCookie = "clinic_dashboard_pending_email"
const PENDING_EMAIL_MAX_AGE_SECONDS = 10 * 60

export type ValidatedEmailCallback = Readonly<{
  next: (typeof clinicDashboardEmailDestinations)[ClinicDashboardEmailFlow]
  tokenHash: string
  type: ClinicDashboardEmailFlow
}>

export function validateEmailCallbackRequest(request: NextRequest): ValidatedEmailCallback | undefined {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type")
  const next = request.nextUrl.searchParams.get("next")
  if (!tokenHash || (type !== "invite" && type !== "recovery")) return undefined

  const expectedNext = clinicDashboardEmailDestinations[type]
  if (next !== expectedNext) return undefined

  return { next: expectedNext, tokenHash, type }
}

function signPendingEmailPayload(payload: string) {
  return createHmac("sha256", validateEnvironment().CSRF_SIGNING_SECRET).update(payload).digest("base64url")
}

export function encodePendingEmailCallback(callback: ValidatedEmailCallback) {
  const payload = Buffer.from(JSON.stringify(callback), "utf8").toString("base64url")
  return `${payload}.${signPendingEmailPayload(payload)}`
}

export function decodePendingEmailCallback(value: string | undefined): ValidatedEmailCallback | undefined {
  if (!value) return undefined
  const [payload, signature, extra] = value.split(".")
  if (!payload || !signature || extra) return undefined

  const expected = Buffer.from(signPendingEmailPayload(payload))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown
    if (!parsed || typeof parsed !== "object") return undefined
    const candidate = parsed as Record<string, unknown>
    if (candidate.type !== "invite" && candidate.type !== "recovery") return undefined
    const expectedNext = clinicDashboardEmailDestinations[candidate.type]
    if (candidate.next !== expectedNext || typeof candidate.tokenHash !== "string" || !candidate.tokenHash) {
      return undefined
    }
    return { next: expectedNext, tokenHash: candidate.tokenHash, type: candidate.type }
  } catch {
    return undefined
  }
}

export function setPendingEmailCallbackCookie(response: NextResponse, callback: ValidatedEmailCallback) {
  response.cookies.set({
    httpOnly: true,
    maxAge: PENDING_EMAIL_MAX_AGE_SECONDS,
    name: clinicDashboardPendingEmailCookie,
    path: "/api/auth/callback",
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    value: encodePendingEmailCallback(callback),
  })
}

export function clearPendingEmailCallbackCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: clinicDashboardPendingEmailCookie,
    path: "/api/auth/callback",
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    value: "",
  })
}
