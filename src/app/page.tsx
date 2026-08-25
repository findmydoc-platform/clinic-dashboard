import { redirect } from "next/navigation"
import {
  ClinicDashboardWorkspace,
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  parseInquiryDeepLink,
} from "@/features/clinic-dashboard/public"
import {
  getClinicDashboardAccess,
  loadClinicDashboardWorkspaceInput,
} from "@/features/clinic-dashboard/server"

type HomePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

export default async function HomePage({ searchParams }: HomePageProps) {
  const focusInquiryId = parseInquiryDeepLink((await searchParams).inquiry)
  const returnTarget = createClinicDashboardReturnTarget(focusInquiryId)
  const access = await getClinicDashboardAccess()
  if (access.status === "unauthenticated") redirect(createClinicDashboardLoginPath(returnTarget))
  if (access.status === "unauthorized") redirect("/access?state=account-unavailable")
  if (access.status === "denied") redirect("/access")
  if (access.status === "temporarily-unavailable") redirect("/access?state=temporarily-unavailable")
  if (access.status !== "approved") redirect(createClinicDashboardLoginPath(returnTarget))

  const workspaceInput = await loadClinicDashboardWorkspaceInput()

  return (
    <ClinicDashboardWorkspace
      authenticatedContext={access.context}
      focusInquiryId={focusInquiryId}
      persistNotificationReadStateInSession
      prototypeMode="presentation"
      workspaceInput={workspaceInput}
    />
  )
}
