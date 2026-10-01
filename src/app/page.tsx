import { redirect } from "next/navigation"
import {
  ClinicDashboardWorkspace,
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  parseInquiryDeepLink,
} from "@/features/clinic-dashboard/public"
import {
  getClinicDashboardAccess,
  loadClinicDashboardInitialReporting,
  loadClinicDashboardWorkspaceInput,
} from "@/features/clinic-dashboard/server"

type HomePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const focusInquiryId = parseInquiryDeepLink(params.inquiry)
  const returnTarget = createClinicDashboardReturnTarget(focusInquiryId)
  const access = await getClinicDashboardAccess()
  if (access.status === "recovery-required") {
    const attempt = typeof params.sessionRecovery === "string" ? params.sessionRecovery : ""
    const mode = attempt ? "clear" : "refresh"
    redirect(
      `/auth/session/recover?next=${encodeURIComponent(returnTarget)}&mode=${mode}&attempt=${encodeURIComponent(attempt)}`,
    )
  }
  if (access.status === "unauthenticated") redirect(createClinicDashboardLoginPath(returnTarget))
  if (access.status === "unauthorized") redirect("/access?state=account-unavailable")
  if (access.status === "denied") redirect("/access")
  if (access.status === "temporarily-unavailable") redirect("/access?state=temporarily-unavailable")
  if (access.status !== "approved") redirect(createClinicDashboardLoginPath(returnTarget))

  const [initialReporting, workspaceInput] = await Promise.all([
    loadClinicDashboardInitialReporting(access.context.clinic.id),
    loadClinicDashboardWorkspaceInput(),
  ])

  return (
    <ClinicDashboardWorkspace
      authenticatedContext={access.context}
      focusInquiryId={focusInquiryId}
      initialReporting={initialReporting}
      persistNotificationReadStateInSession
      prototypeMode="presentation"
      workspaceInput={workspaceInput}
    />
  )
}
