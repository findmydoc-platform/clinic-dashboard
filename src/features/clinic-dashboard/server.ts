import "server-only"

import type { NextRequest } from "next/server"
import { composeClinicDashboardDataProviders } from "./data-provider-composition"
import { clinicDashboardDemoWorkspaceProvider } from "./demo/loader"
import { getClinicDashboardAccessToken } from "./auth/server/public"
import {
  handlePatientInquiryStatusUpdate as handlePatientInquiryStatusUpdateWithProvider,
  type PatientInquiryProviderFactory,
} from "./messages/server/public"
import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"

export { getClinicDashboardAccess } from "./auth/server/public"

const createPatientInquiryProvider: PatientInquiryProviderFactory = (accessToken) =>
  composeClinicDashboardDataProviders(accessToken).inquiries

export function handlePatientInquiryStatusUpdate(request: NextRequest, inquiryId: string) {
  return handlePatientInquiryStatusUpdateWithProvider(request, inquiryId, createPatientInquiryProvider)
}

export async function loadClinicDashboardWorkspaceInput(): Promise<ClinicDashboardWorkspaceInput> {
  const workspace = await clinicDashboardDemoWorkspaceProvider.loadWorkspace()
  const accessToken = await getClinicDashboardAccessToken()
  if (!accessToken) {
    return {
      ...workspace,
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    }
  }

  try {
    const result = await createPatientInquiryProvider(accessToken).loadQueue()
    return {
      ...workspace,
      inquiryQueue: result.ok ? result.value : { inquiries: [], status: "temporarily-unavailable" },
    }
  } catch {
    return {
      ...workspace,
      inquiryQueue: { inquiries: [], status: "temporarily-unavailable" },
    }
  }
}
