import type { AuthorizedClinic } from "@/features/clinic-dashboard/auth/public"

export const clinicPreferenceCookieName = "fmd-clinic-preference"

export function resolveClinicSelection(
  clinics: readonly AuthorizedClinic[],
  principalId: string,
  requestedClinicId?: string,
  preferenceValue?: string,
): Readonly<{
  clinic?: AuthorizedClinic
  reason: "denied" | "empty" | "fallback" | "first" | "requested" | "restored"
}> {
  if (requestedClinicId) {
    const clinic = clinics.find(({ id }) => id === requestedClinicId)
    return clinic ? { clinic, reason: "requested" } : { reason: "denied" }
  }
  if (clinics.length === 0) return { reason: "empty" }
  let preference: unknown
  try {
    preference = preferenceValue ? JSON.parse(preferenceValue) : undefined
  } catch {
    preference = undefined
  }
  if (
    preference &&
    typeof preference === "object" &&
    "principalId" in preference &&
    preference.principalId === principalId &&
    "clinicId" in preference &&
    typeof preference.clinicId === "string"
  ) {
    const clinic = clinics.find(({ id }) => id === preference.clinicId)
    return clinic ? { clinic, reason: "restored" } : { clinic: clinics[0], reason: "fallback" }
  }
  return { clinic: clinics[0], reason: "first" }
}

export function parseClinicDashboardSection(value: unknown) {
  return typeof value === "string" &&
    ["dashboard", "messages", "reviews", "profile", "subscriptions", "certificates-accreditations"].includes(
      value,
    )
    ? (value as import("./workspace").ClinicDashboardSection)
    : "dashboard"
}
