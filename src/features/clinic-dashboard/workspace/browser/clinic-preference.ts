import { clinicPreferenceCookieName } from "../model/clinic-selection"

export function rememberAuthorizedClinic(principalId: string, clinicId: string) {
  const value = encodeURIComponent(JSON.stringify({ principalId, clinicId }))
  document.cookie = `${clinicPreferenceCookieName}=${value}; Path=/; SameSite=Strict; Max-Age=31536000${window.location.protocol === "https:" ? "; Secure" : ""}`
}
