import "server-only"

export const CLINIC_DASHBOARD_CONTRACT_HEADER_NAME = "X-Findmydoc-Clinic-Dashboard-Contract"
const CLINIC_DASHBOARD_CONTRACT_HEADER_VALUE = "inquiry-communication-v2"

export function clinicDashboardContractHeaders() {
  return {
    [CLINIC_DASHBOARD_CONTRACT_HEADER_NAME]: CLINIC_DASHBOARD_CONTRACT_HEADER_VALUE,
  } as const
}
