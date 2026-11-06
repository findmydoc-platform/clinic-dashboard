import "server-only"

import { headers } from "next/headers"

export function withWebsiteDeploymentAccess(fetcher: typeof fetch): typeof fetch {
  return async (input, init) => {
    const target = new URL(input instanceof Request ? input.url : String(input))
    if (target.origin !== "https://preview.findmydoc.eu" || target.username || target.password) {
      return fetcher(input, init)
    }

    let oidcToken: string | undefined
    if (process.env.VERCEL === "1") {
      try {
        // Vercel injects this Function's identity. Never reuse an incoming caller's trusted-source token.
        oidcToken = (await headers()).get("x-vercel-oidc-token")?.trim() || undefined
      } catch {
        // A non-request invocation can still use the separately managed target-project fallback.
      }
    }
    const bypass = process.env.WEBSITE_PREVIEW_PROTECTION_BYPASS?.trim()
    if (!oidcToken && !bypass) return fetcher(input, init)

    const outgoing = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    outgoing.delete("x-vercel-trusted-oidc-idp-token")
    outgoing.delete("x-vercel-protection-bypass")
    if (oidcToken) outgoing.set("x-vercel-trusted-oidc-idp-token", oidcToken)
    else outgoing.set("x-vercel-protection-bypass", bypass!)
    return fetcher(input, { ...init, headers: outgoing, redirect: "error" })
  }
}
