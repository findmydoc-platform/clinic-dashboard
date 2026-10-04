import "server-only"

export { validateWebsiteAction } from "./auth-action-protocol"

export { handleClinicDashboardSessionRecovery } from "./session-recovery"

export { getClinicDashboardAccess, getClinicDashboardAccessToken } from "./access"
export {
  getCompletionAccess,
  handleClinicDashboardBootstrap,
  handleClinicDashboardEmailCallback,
  handleClinicDashboardLogin,
  handleClinicDashboardLogout,
  handleClinicDashboardPasswordCompletion,
  handleClinicDashboardReauthenticate,
  handleClinicDashboardPasswordResetRequest,
} from "./actions"
export {
  decodeCompletionGrant,
  decodePendingEmailCallback,
  encodeCompletionGrant,
  encodePendingEmailCallback,
  setPendingEmailCallbackCookie,
  validateEmailCallbackRequest,
} from "./callback"
export { hasControlledSession, isControlledContactReauthenticationRequired } from "./session"
export { resolveClinicDashboardMutationAccess, resolveClinicDashboardRouteAccess } from "./route-access"
export { createProxySupabaseClient } from "./supabase-client"
export { createClinicDashboardLoginPathForRequest } from "../model/auth"
