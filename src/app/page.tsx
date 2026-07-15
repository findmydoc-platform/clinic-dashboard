import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ClinicDashboardApp } from "@/components/organisms/ClinicDashboard/ClinicDashboardApp"
import { DASHBOARD_AUTH_COOKIE, isValidDashboardSessionToken } from "@/lib/security/dashboard-auth"

export default async function HomePage() {
  const cookieStore = await cookies()
  if (!isValidDashboardSessionToken(cookieStore.get(DASHBOARD_AUTH_COOKIE)?.value)) {
    redirect("/login")
  }

  return <ClinicDashboardApp variant="presentation" />
}
