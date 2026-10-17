export { ClinicDashboardAuthScreen } from "./ClinicDashboardAuthScreen"
export { ClinicDashboardSessionRecoveryPage } from "./ClinicDashboardSessionRecoveryPage"
export { useSessionRecoveryCompletion } from "./hooks/useSessionRecoveryCompletion"
export { loadClinicDashboardChoices, type ClinicAccessChoices } from "./browser/clinic-access-choices"
export type { ClinicDashboardAuthScreenProps } from "./ClinicDashboardAuthScreen"
export { reauthenticateClinicDashboardSession, submitClinicDashboardAuthAction } from "./browser/auth-api"
export type {
  ClinicDashboardReauthenticationCommand,
  ClinicDashboardReauthenticationResult,
} from "./browser/auth-api"
export type {
  AuthenticatedClinicContext,
  AuthorizedClinic,
  ClinicScopeBootstrap,
  ClinicDashboardAuthErrorCode,
  ClinicDashboardCapability,
  ClinicDashboardEmailFlow,
  ClinicDashboardReturnTarget,
} from "./model/auth"
export {
  createClinicDashboardLoginPath,
  createClinicDashboardReturnTarget,
  createClinicDashboardReturnTargetForRequest,
  createClinicDashboardExactTargetPath,
  parseClinicDashboardExactTarget,
  parseClinicDashboardReturnTarget,
  parseInquiryDeepLink,
} from "./model/auth"
