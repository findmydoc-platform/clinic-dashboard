import "server-only"

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { isSecureCookieEnvironment, validateEnvironment } from "@/lib/env"
import { applyPrivateResponseHeaders } from "@/lib/security/private-response"

const AUTH_COOKIE_NAME = "clinic-dashboard-auth"

type CookieSource = Readonly<{
  getAll: () => readonly Readonly<{ name: string; value: string }>[]
}>

type CookieMutation = Readonly<{
  name: string
  options: CookieOptions
  value: string
}>

function normalizeCookieOptions(options: CookieOptions): CookieOptions {
  const { domain: _domain, ...safeOptions } = options

  return {
    ...safeOptions,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureCookieEnvironment(),
  }
}

function createConfiguredClient(
  cookieSource: CookieSource,
  setAll?: (cookies: CookieMutation[], headers: Record<string, string>) => void,
) {
  const environment = validateEnvironment()

  return createServerClient(environment.SUPABASE_URL, environment.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
    },
    cookieOptions: {
      httpOnly: true,
      name: AUTH_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: isSecureCookieEnvironment(),
    },
    cookies: {
      getAll: () => [...cookieSource.getAll()],
      setAll,
    },
  })
}

export type RouteSupabaseClient = Readonly<{
  applyToResponse: (response: NextResponse) => NextResponse
  client: SupabaseClient
}>

export function createRouteSupabaseClient(request: NextRequest): RouteSupabaseClient {
  const cookieMutations: CookieMutation[] = []
  const responseHeaders = new Headers()
  const client = createConfiguredClient(request.cookies, (cookies, headers) => {
    cookieMutations.push(
      ...cookies.map(({ name, options, value }) => ({
        name,
        options: normalizeCookieOptions(options),
        value,
      })),
    )
    for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value)
  })

  return {
    applyToResponse(response) {
      for (const { name, options, value } of cookieMutations) {
        response.cookies.set({ name, value, ...options })
      }
      responseHeaders.forEach((value, name) => response.headers.set(name, value))
      applyPrivateResponseHeaders(response.headers)
      return response
    },
    client,
  }
}

export function createReadOnlySupabaseClient(cookieSource: CookieSource) {
  return createConfiguredClient(cookieSource)
}

export type ProxySupabaseClient = Readonly<{
  client: SupabaseClient
  getResponse: () => NextResponse
}>

export function createProxySupabaseClient(request: NextRequest): ProxySupabaseClient {
  let response = createProxyResponse(request)
  const client = createConfiguredClient(request.cookies, (cookies, headers) => {
    for (const { name, value } of cookies) request.cookies.set(name, value)
    response = createProxyResponse(request)
    for (const { name, options, value } of cookies) {
      response.cookies.set({ name, value, ...normalizeCookieOptions(options) })
    }
    for (const [name, value] of Object.entries(headers)) response.headers.set(name, value)
  })

  return {
    client,
    getResponse: () => response,
  }
}

function createProxyResponse(request: NextRequest) {
  const response = NextResponse.next({ request })
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  return response
}

export function clearDashboardAuthCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (name !== AUTH_COOKIE_NAME && !name.startsWith(`${AUTH_COOKIE_NAME}.`)) continue
    response.cookies.set({
      httpOnly: true,
      maxAge: 0,
      name,
      path: "/",
      sameSite: "lax",
      secure: isSecureCookieEnvironment(),
      value: "",
    })
  }
  return response
}
