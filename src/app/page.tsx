import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  ClinicDashboardWorkspace,
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  parseInquiryDeepLink,
  resolveClinicSelection,
  clinicPreferenceCookieName,
  parseClinicDashboardSection,
} from "@/features/clinic-dashboard/public"
import {
  getClinicDashboardAccess,
  loadClinicDashboardInitialReporting,
  loadClinicDashboardInitialNotifications,
  loadClinicDashboardWorkspaceInput,
} from "@/features/clinic-dashboard/server"

type HomePageProps = Readonly<{
  params?: Promise<{ clinicId?: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}>

export default async function HomePage({ searchParams, params: routeParams }: HomePageProps) {
  const params = await searchParams
  const focusInquiryId = parseInquiryDeepLink(params.inquiry)
  const requestedClinicId = (await routeParams)?.clinicId
  const returnTarget = requestedClinicId
    ? (`/clinics/${encodeURIComponent(requestedClinicId)}?section=${parseClinicDashboardSection(params.section)}` as const)
    : createClinicDashboardReturnTarget(focusInquiryId)
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

  const preference = (await cookies()).get(clinicPreferenceCookieName)?.value
  const selection = resolveClinicSelection(
    access.context.clinics,
    access.context.principal.id,
    requestedClinicId,
    preference,
  )
  if (!selection.clinic) redirect(selection.reason === "denied" ? "/access?state=restricted" : "/access")
  const clinic = selection.clinic
  if (!requestedClinicId) {
    const explanation = selection.reason === "fallback" ? "&selection=fallback" : ""
    const inquiry = focusInquiryId ? `&inquiry=${encodeURIComponent(focusInquiryId)}` : ""
    redirect(
      `/clinics/${encodeURIComponent(clinic.id)}?section=${parseClinicDashboardSection(params.section)}${explanation}${inquiry}`,
    )
  }
  const [initialReporting, workspaceInput] = await Promise.all([
    loadClinicDashboardInitialReporting(clinic.id),
    loadClinicDashboardWorkspaceInput(clinic.id),
  ])
  if (initialReporting.status === "access-denied") redirect("/access?state=restricted")
  if (initialReporting.status === "unauthorized")
    redirect(`/auth/session/recover?next=${encodeURIComponent(returnTarget)}&mode=refresh&attempt=`)
  const initialNotifications = await loadClinicDashboardInitialNotifications(clinic.id)

  return (
    <ClinicDashboardWorkspace
      authenticatedContext={{
        principal: access.context.principal,
        clinic: { id: clinic.id, name: clinic.name },
        capabilities: clinic.capabilities,
        status: "approved",
      }}
      authorizedClinics={access.context.clinics}
      initialSection={parseClinicDashboardSection(params.section)}
      selectionNotice={
        params.selection === "fallback"
          ? "Your previous clinic is no longer available. The first currently authorized clinic is open."
          : undefined
      }
      focusInquiryId={focusInquiryId}
      initialReporting={initialReporting}
      initialNotifications={initialNotifications}
      prototypeMode="presentation"
      workspaceInput={workspaceInput}
    />
  )
}
