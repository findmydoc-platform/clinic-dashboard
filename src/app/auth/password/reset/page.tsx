import type { Metadata } from "next"
import { ClinicDashboardAuthScreen } from "@/features/clinic-dashboard/public"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Reset password | Clinic Dashboard",
}

export default function PasswordResetPage() {
  return <ClinicDashboardAuthScreen mode="reset-request" />
}
