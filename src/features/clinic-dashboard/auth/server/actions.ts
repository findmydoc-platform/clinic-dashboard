import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { isControlledAuthTestMode, validateEnvironment } from "@/lib/env"
import {
  clearCsrfCookie,
  createCsrfToken,
  getValidatedMutationOrigin,
  setCsrfCookie,
  validateMutationRequest,
} from "@/lib/security/csrf"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"
import {
  clinicDashboardEmailDestinations,
  parseClinicDashboardReturnTarget,
  type ClinicDashboardAccessResult,
  type ClinicDashboardAuthErrorCode,
  type ClinicDashboardReturnTarget,
} from "../model/auth"
import { resolveAccessForSession, resolveMutableClinicDashboardAccess } from "./access"
import {
  confirmWebsiteAction,
  prepareWebsiteCompletion,
  requestWebsiteRecovery,
} from "./auth-action-protocol"
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
  clearControlledContactReauthenticationCookie,
  getClinicDashboardSession,
  readVerifiedSupabaseSession,
  setControlledSessionCookie,
  setControlledContactReauthenticationCookie,
} from "./session"
import {
  clearDashboardAuthCookies,
  createRouteSupabaseClient,
  type RouteSupabaseClient,
} from "./supabase-client"

const loginSchema = z
  .object({
    email: z.string().email(),
    next: z.string().min(1).max(128),
    password: z.string().min(1),
  })
  .strict()

const reauthenticationSchema = z.object({ password: z.string().min(1) }).strict()

const resetRequestSchema = z.object({ email: z.string().email().max(254) }).strict()

const passwordSchema = z
  .object({
    confirmPassword: z.string(),
    password: z.string().min(8).max(1024),
  })
  .strict()
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    path: ["confirmPassword"],
  })

const MAX_AUTH_REQUEST_BODY_BYTES = 8 * 1024

function privateJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  applyPrivateResponseHeaders(response.headers)
  response.headers.set("Referrer-Policy", "no-referrer")
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

function accessRedirect(access: ClinicDashboardAccessResult, returnTarget: ClinicDashboardReturnTarget) {
  if (access.status === "approved") return returnTarget
  if (access.status === "denied") return "/access"
  if (access.status === "temporarily-unavailable") return "/access?state=temporarily-unavailable"
  return undefined
}

function applyClient(response: NextResponse, routeClient: RouteSupabaseClient | undefined) {
  return routeClient ? routeClient.applyToResponse(response) : response
}

function applyEmailClient(response: NextResponse, routeClient: RouteSupabaseClient, request: NextRequest) {
  const applied = applyClient(response, routeClient)
  if (response.status === 503) {
    for (const cookie of applied.cookies.getAll()) {
      if (cookie.name !== "clinic-dashboard-auth" && !cookie.name.startsWith("clinic-dashboard-auth."))
        continue
      if (cookie.maxAge === 0) request.cookies.delete(cookie.name)
      else request.cookies.set(cookie.name, cookie.value)
    }
    setCsrfCookie(applied, createCsrfToken(request))
  }
  return applied
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
  const returnTarget = parseClinicDashboardReturnTarget(parsed.data.next)
  if (!returnTarget) return clearCompletionGrant(errorResponse("INVALID_INPUT", 400))

  if (isControlledAuthTestMode()) {
    const environment = validateEnvironment()
    if (
      parsed.data.email !== "clinic-staff@example.com" ||
      parsed.data.password !== environment.CLINIC_DASHBOARD_TEST_PASSWORD
    ) {
      return clearCompletionGrant(errorResponse("INVALID_CREDENTIALS", 401))
    }

    const response = privateJson({ redirectTo: returnTarget })
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
  const redirectTo = accessRedirect(access, returnTarget)
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

export async function handleClinicDashboardReauthenticate(request: NextRequest) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const parsed = reauthenticationSchema.safeParse(await readJson(request))
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400)

  if (isControlledAuthTestMode()) {
    const environment = validateEnvironment()
    const session = await getClinicDashboardSession(request.cookies)
    if (!session?.isClinicAccount) return errorResponse("ACCOUNT_UNAVAILABLE", 401)
    const access = await resolveAccessForSession(session).catch(
      () => ({ status: "temporarily-unavailable" }) as const,
    )
    if (access.status === "temporarily-unavailable") {
      return errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)
    }
    if (access.status !== "approved" || !access.context.capabilities.includes("clinic-inquiries:view")) {
      return errorResponse("REQUEST_REJECTED", 403)
    }
    if (parsed.data.password !== environment.CLINIC_DASHBOARD_TEST_PASSWORD) {
      return errorResponse("INVALID_CREDENTIALS", 401)
    }
    const response = privateJson({ reauthenticated: true })
    setControlledContactReauthenticationCookie(response)
    return response
  }

  const routeClient = createRouteSupabaseClient(request)
  const currentAccess = await resolveMutableClinicDashboardAccess(routeClient.client).catch(
    () => ({ status: "temporarily-unavailable" }) as const,
  )
  if (currentAccess.status === "temporarily-unavailable") {
    return applyClient(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503), routeClient)
  }
  if (currentAccess.status === "unauthenticated" || currentAccess.status === "unauthorized") {
    return applyClient(errorResponse("ACCOUNT_UNAVAILABLE", 401), routeClient)
  }
  if (
    currentAccess.status !== "approved" ||
    !currentAccess.context.capabilities.includes("clinic-inquiries:view")
  ) {
    return applyClient(errorResponse("REQUEST_REJECTED", 403), routeClient)
  }

  const currentSession = await readVerifiedSupabaseSession(routeClient.client).catch(() => undefined)
  if (!currentSession?.isClinicAccount) {
    return applyClient(errorResponse("ACCOUNT_UNAVAILABLE", 401), routeClient)
  }

  let signInError: Readonly<{ status?: number }> | null = null
  try {
    const result = await routeClient.client.auth.signInWithPassword({
      email: currentSession.email,
      password: parsed.data.password,
    })
    signInError = result.error
  } catch {
    return applyClient(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503), routeClient)
  }
  if (signInError) {
    const response =
      signInError.status === 400 || signInError.status === 401
        ? errorResponse("INVALID_CREDENTIALS", 401)
        : errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)
    return applyClient(response, routeClient)
  }

  const refreshedSession = await readVerifiedSupabaseSession(routeClient.client).catch(() => undefined)
  if (!refreshedSession?.isClinicAccount || refreshedSession.subject !== currentSession.subject) {
    await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
    return applyClientAndClear(errorResponse("ACCOUNT_UNAVAILABLE", 401), routeClient, request)
  }

  return applyClient(privateJson({ reauthenticated: true }), routeClient)
}

export async function handleClinicDashboardPasswordResetRequest(request: NextRequest) {
  const requestOrigin = getValidatedMutationOrigin(request)
  if (!requestOrigin) return errorResponse("REQUEST_REJECTED", 403)

  const parsed = resetRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400)
  if (isControlledAuthTestMode()) return privateJson({ accepted: true }, 202)

  await requestWebsiteRecovery(request, parsed.data.email)
  return privateJson({ accepted: true }, 202)
}

export async function handleClinicDashboardEmailCallback(request: NextRequest) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const parsedBody = z
    .object({})
    .strict()
    .safeParse(await readJson(request))
  const callback = decodePendingEmailCallback(request.cookies.get(clinicDashboardPendingEmailCookie)?.value)
  let grant = decodeCompletionGrant(request.cookies.get(clinicDashboardCompletionGrantCookie)?.value)
  const invalid = () => {
    const response = errorResponse("INVALID_OR_EXPIRED_LINK", 400)
    clearPendingEmailCallbackCookie(response)
    clearCompletionGrantCookie(response)
    return response
  }
  if (!parsedBody.success || (!callback && (!grant || grant.attempt))) return invalid()

  if (isControlledAuthTestMode()) {
    if (
      !callback ||
      callback.tokenHash !== `controlled-${callback.type}-token` ||
      callback.actionRef !== `controlled-${callback.type}-reference`
    )
      return invalid()
    const response = privateJson({ redirectTo: callback.next })
    setControlledSessionCookie(response)
    setCompletionGrantCookie(response, {
      actionRef: callback.actionRef,
      flow: callback.type,
      issuedAt: callback.issuedAt,
      state: "confirmed",
      subject: "controlled-clinic-staff",
    })
    clearPendingEmailCallbackCookie(response)
    clearCsrfCookie(response)
    return response
  }

  const routeClient = createRouteSupabaseClient(request)
  if (callback) {
    try {
      const { error } = await routeClient.client.auth.verifyOtp({
        token_hash: callback.tokenHash,
        type: callback.type,
      })
      if (error) return applyClientAndClear(invalid(), routeClient, request)
    } catch {
      return applyEmailClient(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503), routeClient, request)
    }
  }

  let session: Awaited<ReturnType<typeof readVerifiedSupabaseSession>>
  try {
    session = await readVerifiedSupabaseSession(routeClient.client)
  } catch {
    return applyEmailClient(errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503), routeClient, request)
  }
  if (!session?.isClinicAccount || (!callback && grant?.subject !== session.subject)) {
    await routeClient.client.auth.signOut({ scope: "local" }).catch(() => undefined)
    return applyClientAndClear(invalid(), routeClient, request)
  }
  if (callback) {
    grant = {
      actionRef: callback.actionRef,
      flow: callback.type,
      issuedAt: callback.issuedAt,
      state: "confirming",
      subject: session.subject,
    }
  }
  if (!grant) return applyClient(invalid(), routeClient)
  const outcome = await confirmWebsiteAction(grant.actionRef, grant.flow, session.accessToken)
  if (outcome === "invalid") return applyClient(invalid(), routeClient)
  const response =
    outcome === "confirmed"
      ? privateJson({ redirectTo: clinicDashboardEmailDestinations[grant.flow] })
      : errorResponse("AUTH_TEMPORARILY_UNAVAILABLE", 503)
  setCompletionGrantCookie(response, {
    ...grant,
    state: outcome === "confirmed" ? "confirmed" : "confirming",
  })
  clearPendingEmailCallbackCookie(response)
  if (outcome === "confirmed") clearCsrfCookie(response)
  return applyEmailClient(response, routeClient, request)
}

export async function handleClinicDashboardPasswordCompletion(
  request: NextRequest,
  flow: "invite" | "recovery",
) {
  const rejected = rejectedMutation(request)
  if (rejected) return rejected

  const grant = decodeCompletionGrant(request.cookies.get(clinicDashboardCompletionGrantCookie)?.value)
  const parsed = passwordSchema.safeParse(await readJson(request))
  if (!parsed.success) return errorResponse("INVALID_INPUT", 400)

  if (isControlledAuthTestMode()) {
    const session = await getClinicDashboardSession(request.cookies)
    if (
      !session ||
      !grant ||
      grant.state !== "confirmed" ||
      grant.flow !== flow ||
      grant.subject !== session.subject
    ) {
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
  if (
    !session ||
    !grant ||
    grant.state !== "confirmed" ||
    grant.flow !== flow ||
    grant.subject !== session.subject
  ) {
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

  const completion = prepareWebsiteCompletion(grant, session.accessToken, parsed.data.password)
  if (!completion)
    return applyEmailClient(errorResponse("AUTH_COMPLETION_UNCERTAIN", 503), routeClient, request)
  const outcome = await completion.complete()
  if (outcome === "invalid")
    return applyClient(clearCompletionGrant(errorResponse("INVALID_OR_EXPIRED_LINK", 400)), routeClient)
  if (outcome !== "completed") {
    const response = errorResponse("AUTH_COMPLETION_UNCERTAIN", 503)
    setCompletionGrantCookie(response, { ...grant, attempt: completion.attempt })
    return applyEmailClient(response, routeClient, request)
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
    clearControlledContactReauthenticationCookie(response)
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
  if (!grant || grant.state !== "confirmed" || grant.flow !== flow || grant.subject !== session.subject) {
    return { status: "unauthenticated" } as const
  }
  return fetchClinicDashboardBootstrap(session.accessToken)
}
