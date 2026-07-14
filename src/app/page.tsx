import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { FoundationHome } from "@/components/organisms/AppShell/FoundationHome"
import { ClinicDashboardTemplate } from "@/components/templates/ClinicDashboardTemplate"
import { DASHBOARD_AUTH_COOKIE, isValidDashboardSessionToken } from "@/lib/security/dashboard-auth"

export default async function HomePage() {
  const cookieStore = await cookies()
  if (!isValidDashboardSessionToken(cookieStore.get(DASHBOARD_AUTH_COOKIE)?.value)) {
    redirect("/login")
  }

  return (
    <ClinicDashboardTemplate>
      <FoundationHome />
    </ClinicDashboardTemplate>
  )
}
