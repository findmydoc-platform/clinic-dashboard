import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ClinicDashboardAuthScreen } from "@/features/clinic-dashboard/public"
import { getCompletionAccess } from "@/features/clinic-dashboard/auth/server/public"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Choose a new password | Clinic Dashboard",
}

export default async function CompletePasswordResetPage() {
  const access = await getCompletionAccess(await cookies())
  if (access.status === "unauthenticated" || access.status === "unauthorized") {
    redirect("/login?error=invalid-or-expired-link")
  }
  if (access.status === "temporarily-unavailable") {
    return <ClinicDashboardAuthScreen mode="access" state="temporarily-unavailable" />
  }

  return <ClinicDashboardAuthScreen flow="recovery" mode="complete-password" />
}
