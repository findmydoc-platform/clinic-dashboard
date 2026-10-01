import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  ClinicDashboardSessionRecoveryPage,
  parseClinicDashboardReturnTarget,
} from "@/features/clinic-dashboard/public"
import { CLINIC_DASHBOARD_CSRF_COOKIE } from "@/lib/security/csrf-contract"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Opening dashboard | Clinic Dashboard",
}

type RecoveryPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const params = await searchParams
  const returnTarget = parseClinicDashboardReturnTarget(params.next)
  if (!returnTarget || (params.mode !== "refresh" && params.mode !== "clear")) redirect("/login")
  const csrfToken = (await cookies()).get(CLINIC_DASHBOARD_CSRF_COOKIE)?.value
  if (!csrfToken) redirect("/login")
  return (
    <ClinicDashboardSessionRecoveryPage
      attempt={typeof params.attempt === "string" ? params.attempt : ""}
      csrfToken={csrfToken}
      mode={params.mode}
      returnTarget={returnTarget}
    />
  )
}
