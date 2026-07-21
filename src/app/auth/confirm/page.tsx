import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ClinicDashboardAuthScreen } from "@/features/clinic-dashboard/public"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Confirm secure link | Clinic Dashboard",
}

type ConfirmPageProps = Readonly<{
  searchParams: Promise<Readonly<{ type?: string }>>
}>

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const params = await searchParams
  if (params.type !== "invite" && params.type !== "recovery") {
    redirect("/login?error=invalid-or-expired-link")
  }

  return <ClinicDashboardAuthScreen mode="confirm" type={params.type} />
}
