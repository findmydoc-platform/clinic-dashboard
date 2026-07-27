import "server-only"

import { isControlledAuthTestMode } from "@/lib/env"
import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import { getClinicDashboardAccessToken } from "./auth/server/public"
import { fetchPatientInquiryQueue, getControlledPatientInquiryQueue } from "./messages/server/public"
import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

export { getClinicDashboardAccess } from "./auth/server/public"
export { handlePatientInquiryStatusUpdate } from "./messages/server/public"

export async function loadClinicDashboardWorkspaceInput(): Promise<ClinicDashboardWorkspaceInput> {
  const workspace = await clinicDashboardDemoWorkspaceProvider.loadWorkspace()
  if (isControlledAuthTestMode()) {
    return { ...workspace, inquiryQueue: getControlledPatientInquiryQueue() }
  }

  const accessToken = await getClinicDashboardAccessToken()
  if (!accessToken) {
    return {
      ...workspace,
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    }
  }

  try {
    return {
      ...workspace,
      inquiryQueue: await fetchPatientInquiryQueue(accessToken),
    }
  } catch {
    return {
      ...workspace,
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    }
  }
}
