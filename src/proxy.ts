import { NextResponse } from "next/server"
import { validateEnvironment } from "@/lib/env"

function isPreviewDeployment() {
  return process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === "preview"
}

function withDeploymentHeaders(response: NextResponse) {
  if (isPreviewDeployment()) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
  }

  return response
}

export function proxy() {
  validateEnvironment()
  return withDeploymentHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
