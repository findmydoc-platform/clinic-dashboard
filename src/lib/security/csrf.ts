import "server-only"

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import {
  getTrustedDashboardOrigin,
  getTrustedRequestDashboardOrigin,
  isSecureCookieEnvironment,
  validateEnvironment,
} from "@/lib/env"
import { CLINIC_DASHBOARD_CSRF_COOKIE, CLINIC_DASHBOARD_CSRF_HEADER } from "./csrf-contract"

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8

function getSessionFingerprint(request: NextRequest) {
  const authCookies = request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith("clinic-dashboard-auth"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(({ name, value }) => `${name}=${value}`)
    .join(";")

  return authCookies || "anonymous"
}

function signToken(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

function safeEqual(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

export function createCsrfToken(request: NextRequest, now = Date.now()) {
  const environment = validateEnvironment()
  const issuedAt = Math.floor(now / 1000)
  const nonce = randomBytes(24).toString("base64url")
  const payload = `${issuedAt}.${nonce}`
  const signature = signToken(`${getSessionFingerprint(request)}.${payload}`, environment.CSRF_SIGNING_SECRET)

  return `${payload}.${signature}`
}

export function isValidCsrfToken(request: NextRequest, token: string | undefined, now = Date.now()) {
  if (!token) return false

  const environment = validateEnvironment()
  const [issuedAtValue, nonce, signature, extra] = token.split(".")
  if (!issuedAtValue || !nonce || !signature || extra) return false

  const issuedAt = Number(issuedAtValue)
  const age = Math.floor(now / 1000) - issuedAt
  if (!Number.isSafeInteger(issuedAt) || age < 0 || age > TOKEN_MAX_AGE_SECONDS) return false

  const expectedSignature = signToken(
    `${getSessionFingerprint(request)}.${issuedAtValue}.${nonce}`,
    environment.CSRF_SIGNING_SECRET,
  )

  return safeEqual(expectedSignature, signature)
}

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set({
    httpOnly: false,
    maxAge: TOKEN_MAX_AGE_SECONDS,
    name: CLINIC_DASHBOARD_CSRF_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    value: token,
  })
}

export function clearCsrfCookie(response: NextResponse) {
  response.cookies.set({
    httpOnly: false,
    maxAge: 0,
    name: CLINIC_DASHBOARD_CSRF_COOKIE,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
    value: "",
  })
}

export function getValidatedMutationOrigin(request: NextRequest) {
  const environment = validateEnvironment()
  const requestOrigin = getTrustedDashboardOrigin(request.headers.get("origin"), environment)
  const requestUrlOrigin = getTrustedRequestDashboardOrigin(request, environment)
  const cookieToken = request.cookies.get(CLINIC_DASHBOARD_CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CLINIC_DASHBOARD_CSRF_HEADER) ?? undefined

  if (
    requestOrigin !== undefined &&
    requestOrigin === requestUrlOrigin &&
    request.headers.get("content-type")?.toLowerCase().startsWith("application/json") === true &&
    cookieToken !== undefined &&
    headerToken !== undefined &&
    safeEqual(cookieToken, headerToken) &&
    isValidCsrfToken(request, cookieToken)
  ) {
    return requestOrigin
  }

  return undefined
}

export function validateMutationRequest(request: NextRequest) {
  return getValidatedMutationOrigin(request) !== undefined
}
