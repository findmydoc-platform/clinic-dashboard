import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { getExpectedDashboardOrigin, isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import { clearCsrfCookie, validateMutationRequest } from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import {
  clinicDashboardEmailDestinations,
  type ClinicDashboardAccessResult,
  type ClinicDashboardAuthErrorCode,
} from "../model/auth"
import { resolveAccessForSession, resolveMutableClinicDashboardAccess } from "./access"
import {
  clearCompletionGrantCookie,
  clearPendingEmailCallbackCookie,
  clinicDashboardCompletionGrantCookie,
  clinicDashboardPendingEmailCookie,
  decodeCompletionGrant,
  decodePendingEmailCallback,
  setCompletionGrantCookie,
} from "./callback"
import { fetchClinicDashboardBootstrap } from "./payload-bootstrap"
import {
  clearControlledSessionCookie,
  getClinicDashboardSession,
  readVerifiedSupabaseSession,
  setControlledSessionCookie,
} from "./session"
import {
  clearDashboardAuthCookies,
  createRouteSupabaseClient,
  type RouteSupabaseClient,
} from "./supabase-client"

const loginSchema = z.object({
  email: z.string().email(),
  next: z.literal("/"),
  password: z.string().min(1),
})

const resetRequestSchema = z.object({
  email: z.string().email(),
})

const passwordSchema = z
  .object({
    confirmPassword: z.string(),
    password: z.string().min(8),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    path: ["confirmPassword"],
  })

const MAX_AUTH_REQUEST_BODY_BYTES = 8 * 1024

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  return response
}

function errorResponse(code: ClinicDashboardAuthErrorCode, status: number) {
  return privateJson({ code }, status)
}

async function readJson(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const parsedLength = Number(contentLength)
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAX_AUTH_REQUEST_BODY_BYTES
    ) {
      return null
    }
  }

  const body = await request.text().catch(() => "")
  if (!body || Buffer.byteLength(body, "utf8") > MAX_AUTH_REQUEST_BODY_BYTES) return null
  try {
    return JSON.parse(body) as unknown
  } catch {
    return null
  }
}

function rejectedMutation(request: NextRequest) {
  return validateMutationRequest(request) ? undefined : errorResponse("REQUEST_REJECTED", 403)
}

function accessRedirect(access: ClinicDashboardAccessResult) {
  if (access.status === "approved") return "/"
  if (access.status === "denied") return "/access"
  if (access.status === "temporarily-unavailable") return "/access?state=temporarily-unavailable"
  return undefined
}

function applyClient(response: NextResponse, routeClient: RouteSupabaseClient | undefined) {
  return routeClient ? routeClient.applyToResponse(response) : response
}

function applyClientAndClear(response: NextResponse, routeClient: RouteSupabaseClient, request: NextRequest) {
  return clearDashboardAuthCookies(request, applyClient(response, routeClient))
}

function clearCompletionGrant(response: NextResponse) {
  clearCompletionGrantCookie(response)
  return response
}

export async function handleClinicDashboardLogin(request: NextRequest) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const parsed = loginSchema.safeParse(await readJson(request))
  if (!parsed.success) return clearCompletionGrant(errorResponse("INVALID_INPUT", 400))

  if (isControlledAuthTestMode()) {
    const environment = validateEnvironment()
    if (
      parsed.data.email !== "clinic-staff@example.com" ||
      parsed.data.password !== environment.CLINIC_DASHBOARD_TEST_PASSWORD
    ) {
      return clearCompletionGrant(errorResponse("INVALID_CREDENTIALS", 401))
    }

    const response = privateJson({ redirectTo: "/" })
    setControlledSessionCookie(response)
    clearCsrfCookie(response)
    clearCompletionGrantCookie(response)
    return response
  }

  const routeClient = createRouteSupabaseClient(request)
  let signInError: Readonly<{ status?: number }> | null = null
  try {
    const result = await routeClient.client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })
    signInError = result.error
  } catch {
    return applyClient(clearCompletionGrant(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)), routeClient)
  }

  if (signInError) {
    const response =
      signInError.status === 400 || signInError.status === 401
        ? errorResponse("INVALID_CREDENTIALS", 401)
        : errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)
    return applyClient(clearCompletionGrant(response), routeClient)
  }

  const access = await resolveMutableClinicDashboardAccess(routeClient.client)
  const redirectTo = accessRedirect(access)
  if (redirectTo) {
    const response = privateJson({ redirectTo })
    clearCsrfCookie(response)
    clearCompletionGrantCookie(response)
    return applyClient(response, routeClient)
  }

  await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
  return applyClientAndClear(
    clearCompletionGrant(errorResponse("ACCOUNT_UNAVAILABLE", 401)),
    routeClient,
    request,
  )
}

export async function handleClinicDashboardPasswordResetRequest(request: NextRequest) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const parsed = resetRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400)
  if (isControlledAuthTestMode()) return privateJson({ accepted: true }, 202)

  const routeClient = createRouteSupabaseClient(request)
  const environment = validateEnvironment()
  const callback = new URL("/auth/callback", getExpectedDashboardOrigin(environment))
  callback.searchParams.set("next", clinicDashboardEmailDestinations.recovery)

  try {
    await routeClient.client.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: callback.toString(),
    })
  } catch {
    // The response remains neutral to avoid account enumeration.
  }

  return applyClient(privateJson({ accepted: true }, 202), routeClient)
}

export async function handleClinicDashboardEmailCallback(request: NextRequest) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const parsedBody = z
    .object({})
    .strict()
    .safeParse(await readJson(request))
  const callback = decodePendingEmailCallback(request.cookies.get(clinicDashboardPendingEmailCookie)?.value)
  if (!parsedBody.success || !callback) {
    const response = errorResponse("INVALID_OR_EXPIRED_LINK", 400)
    clearPendingEmailCallbackCookie(response)
    clearCompletionGrantCookie(response)
    return response
  }

  if (isControlledAuthTestMode()) {
    const expectedToken = `controlled-${callback.type}-token`
    if (callback.tokenHash !== expectedToken) {
      const response = errorResponse("INVALID_OR_EXPIRED_LINK", 400)
      clearPendingEmailCallbackCookie(response)
      clearCompletionGrantCookie(response)
      return response
    }
    const response = privateJson({ redirectTo: callback.next })
    setControlledSessionCookie(response)
    setCompletionGrantCookie(response, {
      flow: callback.type,
      subject: "controlled-clinic-staff",
    })
    clearPendingEmailCallbackCookie(response)
    clearCsrfCookie(response)
    return response
  }

  const routeClient = createRouteSupabaseClient(request)
  try {
    const { error } = await routeClient.client.auth.verifyOtp({
      token_hash: callback.tokenHash,
      type: callback.type,
    })
    if (error) {
      const response = applyClientAndClear(
        errorResponse("INVALID_OR_EXPIRED_LINK", 400),
        routeClient,
        request,
      )
      clearPendingEmailCallbackCookie(response)
      clearCompletionGrantCookie(response)
      return response
    }
  } catch {
    return applyClient(clearCompletionGrant(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)), routeClient)
  }

  const access = await resolveMutableClinicDashboardAccess(routeClient.client)
  if (access.status === "unauthorized" || access.status === "unauthenticated") {
    await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
    const response = applyClientAndClear(errorResponse("ACCOUNT_UNAVAILABLE", 401), routeClient, request)
    clearPendingEmailCallbackCookie(response)
    clearCompletionGrantCookie(response)
    return response
  }

  const session = await readVerifiedSupabaseSession(routeClient.client)
  if (!session || !session.isClinicAccount) {
    await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
    const response = applyClientAndClear(errorResponse("ACCOUNT_UNAVAILABLE", 401), routeClient, request)
    clearPendingEmailCallbackCookie(response)
    clearCompletionGrantCookie(response)
    return response
  }

  const response = privateJson({ redirectTo: callback.next })
  setCompletionGrantCookie(response, { flow: callback.type, subject: session.subject })
  clearPendingEmailCallbackCookie(response)
  clearCsrfCookie(response)
  return applyClient(response, routeClient)
}

export async function handleClinicDashboardPasswordCompletion(
  request: NextRequest,
  flow: "invite" | "recovery",
) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const grant = decodeCompletionGrant(request.cookies.get(clinicDashboardCompletionGrantCookie)?.value)
  const parsed = passwordSchema.safeParse(await readJson(request))
  if (!parsed.success) return clearCompletionGrant(errorResponse("INVALID_INPUT", 400))

  if (isControlledAuthTestMode()) {
    const session = await getClinicDashboardSession(request.cookies)
    if (!session || !grant || grant.flow !== flow || grant.subject !== session.subject) {
      return clearCompletionGrant(errorResponse("INVALID_OR_EXPIRED_LINK", 401))
    }
    const response = privateJson({ redirectTo: `/login?status=${flow}-complete` })
    clearControlledSessionCookie(response)
    clearCsrfCookie(response)
    clearCompletionGrantCookie(response)
    return response
  }

  const routeClient = createRouteSupabaseClient(request)
  const session = await readVerifiedSupabaseSession(routeClient.client)
  if (!session || !grant || grant.flow !== flow || grant.subject !== session.subject) {
    return applyClientAndClear(
      clearCompletionGrant(errorResponse("INVALID_OR_EXPIRED_LINK", 401)),
      routeClient,
      request,
    )
  }
  if (!session.isClinicAccount) {
    return applyClientAndClear(
      clearCompletionGrant(errorResponse("ACCOUNT_UNAVAILABLE", 401)),
      routeClient,
      request,
    )
  }

  const access = await resolveMutableClinicDashboardAccess(routeClient.client)
  if (access.status === "unauthenticated") {
    return applyClientAndClear(
      clearCompletionGrant(errorResponse("INVALID_OR_EXPIRED_LINK", 401)),
      routeClient,
      request,
    )
  }
  if (access.status === "unauthorized") {
    return applyClientAndClear(
      clearCompletionGrant(errorResponse("ACCOUNT_UNAVAILABLE", 401)),
      routeClient,
      request,
    )
  }
  if (access.status === "temporarily-unavailable") {
    return applyClient(
      clearCompletionGrant(errorResponse("SERVICE_TEMPORARILY_UNAVAILABLE", 503)),
      routeClient,
    )
  }

  try {
    const { error } = await routeClient.client.auth.updateUser({ password: parsed.data.password })
    if (error) return applyClient(clearCompletionGrant(errorResponse("INVALID_INPUT", 400)), routeClient)
  } catch {
    return applyClient(clearCompletionGrant(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)), routeClient)
  }

  if (flow === "recovery") {
    const globalSignOut = await routeClient.client.auth
      .signOut({ scope: "global" })
      .catch(() => ({ error: new Error("Global sign-out failed") }))
    if (globalSignOut.error) {
      await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
    }
  } else {
    await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
  }

  const response = privateJson({ redirectTo: `/login?status=${flow}-complete` })
  clearCsrfCookie(response)
  clearCompletionGrantCookie(response)
  return applyClientAndClear(response, routeClient, request)
}

export async function handleClinicDashboardLogout(request: NextRequest) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  if (isControlledAuthTestMode()) {
    const response = privateJson({ redirectTo: "/login" })
    clearControlledSessionCookie(response)
    clearCsrfCookie(response)
    clearCompletionGrantCookie(response)
    clearPendingEmailCallbackCookie(response)
    return response
  }

  const routeClient = createRouteSupabaseClient(request)
  const session = await readVerifiedSupabaseSession(routeClient.client)
  if (!session) {
    const response = errorResponse("ACCOUNT_UNAVAILABLE", 401)
    clearCsrfCookie(response)
    clearCompletionGrantCookie(response)
    clearPendingEmailCallbackCookie(response)
    return applyClientAndClear(response, routeClient, request)
  }

  await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
  const response = privateJson({ redirectTo: "/login" })
  clearCsrfCookie(response)
  clearCompletionGrantCookie(response)
  clearPendingEmailCallbackCookie(response)
  return applyClientAndClear(response, routeClient, request)
}

export async function handleClinicDashboardBootstrap(request: NextRequest) {
  let access: ClinicDashboardAccessResult
  let routeClient: RouteSupabaseClient | undefined

  if (isControlledAuthTestMode()) {
    access = await resolveAccessForSession(await getClinicDashboardSession(request.cookies))
  } else {
    routeClient = createRouteSupabaseClient(request)
    access = await resolveMutableClinicDashboardAccess(routeClient.client)
  }

  let response: NextResponse
  if (access.status === "approved") response = privateJson(access.context)
  else if (access.status === "denied") {
    response = privateJson({ code: "CLINIC_DASHBOARD_ACCESS_DENIED" }, 403)
  } else if (access.status === "temporarily-unavailable") {
    response = privateJson({ code: "CLINIC_DASHBOARD_TEMPORARILY_UNAVAILABLE" }, 503)
  } else {
    response = privateJson({ code: "CLINIC_DASHBOARD_UNAUTHORIZED" }, 401)
  }

  response.headers.set("Vary", "Cookie")
  if (routeClient && (access.status === "unauthenticated" || access.status === "unauthorized")) {
    return applyClientAndClear(response, routeClient, request)
  }
  return applyClient(response, routeClient)
}

export async function getCompletionAccess(
  requestCookies: Parameters<typeof getClinicDashboardSession>[0],
  flow: "invite" | "recovery",
) {
  const session = await getClinicDashboardSession(requestCookies)
  if (!session || !session.isClinicAccount) return { status: "unauthenticated" } as const
  const grant = decodeCompletionGrant(requestCookies.get(clinicDashboardCompletionGrantCookie)?.value)
  if (!grant || grant.flow !== flow || grant.subject !== session.subject) {
    return { status: "unauthenticated" } as const
  }
  return fetchClinicDashboardBootstrap(session.accessToken)
}
