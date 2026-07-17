export type ClinicProfileManagementAccess = "hidden" | "interactive" | "read-only"

export function isClinicProfileManagementInteractive(access: ClinicProfileManagementAccess) {
  return access === "interactive"
}

export function isClinicProfileManagementVisible(access: ClinicProfileManagementAccess) {
  return access !== "hidden"
}
