import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ClinicDashboardAuthScreen } from "@/features/clinic-dashboard/public"
import { getClinicDashboardAccess } from "@/features/clinic-dashboard/auth/server/public"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Clinic access | Clinic Dashboard",
}

type AccessPageProps = Readonly<{
  searchParams: Promise<Readonly<{ state?: string }>>
}>

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const [access, params] = await Promise.all([getClinicDashboardAccess(), searchParams])
  if (access.status === "unauthenticated") redirect("/login")
  if (access.status === "approved") redirect("/")

  const state =
    access.status === "unauthorized" || params.state === "account-unavailable"
      ? "account-unavailable"
      : access.status === "temporarily-unavailable" || params.state === "temporarily-unavailable"
        ? "temporarily-unavailable"
        : "denied"

  return <ClinicDashboardAuthScreen mode="access" state={state} />
}
