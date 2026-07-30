import { redirect } from "next/navigation"
import { ClinicDashboardWorkspace } from "@/features/clinic-dashboard/public"
import {
  getClinicDashboardAccess,
  loadClinicDashboardWorkspaceInput,
} from "@/features/clinic-dashboard/server"

export default async function HomePage() {
  const access = await getClinicDashboardAccess()
  if (access.status === "unauthenticated") redirect("/login")
  if (access.status === "unauthorized") redirect("/access?state=account-unavailable")
  if (access.status === "denied") redirect("/access")
  if (access.status === "temporarily-unavailable") redirect("/access?state=temporarily-unavailable")
  if (access.status !== "approved") redirect("/login")

  const workspaceInput = await loadClinicDashboardWorkspaceInput()

  return (
    <ClinicDashboardWorkspace
      authenticatedContext={access.context}
      persistNotificationReadStateInSession
      prototypeMode="presentation"
      workspaceInput={workspaceInput}
    />
  )
}
