import type { Metadata } from "next"
import {
  ClinicDashboardAuthScreen,
  type ClinicDashboardAuthErrorCode,
} from "@/features/clinic-dashboard/public"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Sign in | Clinic Dashboard",
}

type LoginPageProps = Readonly<{
  searchParams: Promise<Readonly<{ error?: string; status?: string }>>
}>

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, status } = await searchParams
  const initialError: ClinicDashboardAuthErrorCode | undefined =
    error === "invalid-or-expired-link"
      ? "INVALID_OR_EXPIRED_LINK"
      : error === "account-unavailable"
        ? "ACCOUNT_UNAVAILABLE"
        : undefined
  const initialStatus = status === "invite-complete" || status === "recovery-complete" ? status : undefined

  return <ClinicDashboardAuthScreen initialError={initialError} initialStatus={initialStatus} mode="login" />
}
