import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getClinicDashboardSessionRecoveryCsrfToken } from "@/features/clinic-dashboard/auth/server/public"
import {
  ClinicDashboardSessionRecoveryPage,
  parseClinicDashboardReturnTarget,
} from "@/features/clinic-dashboard/public"

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
  const csrfToken = await getClinicDashboardSessionRecoveryCsrfToken()
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
