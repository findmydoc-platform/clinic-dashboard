export {
  ClinicDashboardWorkspace,
  type ClinicDashboardWorkspaceProps,
} from "./workspace/ClinicDashboardWorkspace"
export { ClinicDashboardAuthScreen } from "./auth/public"
export { ClinicDashboardSessionRecoveryPage } from "./auth/public"
export type {
  AuthenticatedClinicContext,
  AuthorizedClinic,
  ClinicScopeBootstrap,
  ClinicDashboardAuthErrorCode,
  ClinicDashboardCapability,
  ClinicDashboardEmailFlow,
  ClinicDashboardReturnTarget,
} from "./auth/public"
export {
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  parseClinicDashboardReturnTarget,
  parseInquiryDeepLink,
} from "./auth/public"
export type { ClinicDashboardPrototypeMode } from "./prototype/public"
export type { ClinicDashboardDialog, ClinicDashboardSection } from "./workspace/public"

export {
  resolveClinicSelection,
  clinicPreferenceCookieName,
  parseClinicDashboardSection,
} from "./workspace/model/clinic-selection"
