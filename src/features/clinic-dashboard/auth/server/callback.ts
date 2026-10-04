import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSecureCookieEnvironment, validateEnvironment } from "@/lib/env"
import { clinicDashboardEmailDestinations, type ClinicDashboardEmailFlow } from "../model/auth"

export const clinicDashboardPendingEmailCookie = "clinic_dashboard_pending_email"
export const clinicDashboardCompletionGrantCookie = "clinic_dashboard_completion_grant"
const CONTEXT_MAX_AGE_SECONDS = 600

const callbackSchema = z
  .object({
    actionRef: z.string().min(1).max(1024),
    next: z.enum(["/auth/invite/complete", "/auth/password/reset/complete"]),
    tokenHash: z.string().min(1).max(256),
    type: z.enum(["invite", "recovery"]),
  })
  .strict()
  .refine((value) => value.next === clinicDashboardEmailDestinations[value.type])
const pendingSchema = callbackSchema.safeExtend({ issuedAt: z.number().int().nonnegative() })
const attemptSchema = z
  .object({
    requestId: z.uuid(),
    timestamp: z.iso.datetime(),
    keyVersion: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    bodyBinding: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
const grantSchema = z
  .object({
    actionRef: z.string().min(1).max(1024),
    flow: z.enum(["invite", "recovery"]),
    issuedAt: z.number().int().nonnegative(),
    subject: z.string().min(1).max(100),
    state: z.enum(["confirming", "confirmed"]),
    attempt: attemptSchema.optional(),
  })
  .strict()

export type ValidatedEmailCallback = Readonly<z.infer<typeof callbackSchema>>
export type PendingEmailCallback = Readonly<z.infer<typeof pendingSchema>>
export type CompletionGrant = Readonly<z.infer<typeof grantSchema>>
export type CompletionAttempt = Readonly<z.infer<typeof attemptSchema>>

export function validateEmailCallbackRequest(request: NextRequest): ValidatedEmailCallback | undefined {
  const params = request.nextUrl.searchParams
  const allowed = new Set(["token_hash", "type", "next", "actionRef", "authActionId"])
  if ([...params.keys()].some((key) => !allowed.has(key) || params.getAll(key).length !== 1)) return undefined
  const type = params.get("type")
  if (type !== "invite" && type !== "recovery") return undefined
  const next = clinicDashboardEmailDestinations[type]
  if (params.has("next") && params.get("next") !== next) return undefined
  const parsed = callbackSchema.safeParse({
    actionRef: params.get("actionRef"),
    next,
    tokenHash: params.get("token_hash"),
    type,
  })
  return parsed.success ? parsed.data : undefined
}

function signPayload(purpose: string, payload: string) {
  const environment = validateEnvironment()
  return createHmac("sha256", environment.CSRF_SIGNING_SECRET)
    .update(
      JSON.stringify([
        "dashboard-auth-context-v1",
        purpose,
        environment.VERCEL_ENV ?? environment.NODE_ENV ?? "development",
        environment.DASHBOARD_ORIGIN,
        payload,
      ]),
    )
    .digest("base64url")
}

function encode(purpose: string, value: unknown) {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url")
  return `${payload}.${signPayload(purpose, payload)}`
}

function decode(purpose: string, value: string | undefined): unknown {
  if (!value || value.length > 3800) return undefined
  const [payload, signature, extra] = value.split(".")
  if (!payload || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(payload)) return undefined
  const expected = Buffer.from(signPayload(purpose, payload))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined
  try {
    const bytes = Buffer.from(payload, "base64url")
    if (bytes.toString("base64url") !== payload) return undefined
    return JSON.parse(bytes.toString("utf8")) as unknown
  } catch {
    return undefined
  }
}

function fresh(issuedAt: number, now: number) {
  const age = Math.floor(now / 1000) - issuedAt
  return age >= 0 && age < CONTEXT_MAX_AGE_SECONDS
}

export function encodePendingEmailCallback(callback: ValidatedEmailCallback, now = Date.now()) {
  return encode("pending", { ...callback, issuedAt: Math.floor(now / 1000) })
}

export function decodePendingEmailCallback(
  value: string | undefined,
  now = Date.now(),
): PendingEmailCallback | undefined {
  const parsed = pendingSchema.safeParse(decode("pending", value))
  return parsed.success && fresh(parsed.data.issuedAt, now) ? parsed.data : undefined
}

export function encodeCompletionGrant(grant: CompletionGrant) {
  return encode("completion", grant)
}

export function decodeCompletionGrant(
  value: string | undefined,
  now = Date.now(),
): CompletionGrant | undefined {
  const parsed = grantSchema.safeParse(decode("completion", value))
  return parsed.success && fresh(parsed.data.issuedAt, now) ? parsed.data : undefined
}

function setContextCookie(response: NextResponse, name: string, value: string, path: string, maxAge: number) {
  response.cookies.set({
    httpOnly: true,
    maxAge,
    name,
    path,
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    value,
  })
}

export function setCompletionGrantCookie(
  response: NextResponse,
  grant: Omit<CompletionGrant, "issuedAt"> & { issuedAt?: number },
  now = Date.now(),
) {
  const issuedAt = grant.issuedAt ?? Math.floor(now / 1000)
  setContextCookie(
    response,
    clinicDashboardCompletionGrantCookie,
    encodeCompletionGrant({ ...grant, issuedAt }),
    "/",
    Math.max(0, CONTEXT_MAX_AGE_SECONDS - (Math.floor(now / 1000) - issuedAt)),
  )
}

export function clearCompletionGrantCookie(response: NextResponse) {
  setContextCookie(response, clinicDashboardCompletionGrantCookie, "", "/", 0)
}

export function setPendingEmailCallbackCookie(response: NextResponse, callback: ValidatedEmailCallback) {
  setContextCookie(
    response,
    clinicDashboardPendingEmailCookie,
    encodePendingEmailCallback(callback),
    "/api/auth/callback",
    CONTEXT_MAX_AGE_SECONDS,
  )
}

export function clearPendingEmailCallbackCookie(response: NextResponse) {
  setContextCookie(response, clinicDashboardPendingEmailCookie, "", "/api/auth/callback", 0)
}

export function websiteAuthFlow(flow: ClinicDashboardEmailFlow) {
  return flow === "invite" ? ("clinic-invitation" as const) : ("clinic-recovery" as const)
}
