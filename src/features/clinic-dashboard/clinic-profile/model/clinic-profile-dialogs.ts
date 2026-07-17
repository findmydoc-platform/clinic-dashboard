export type ClinicProfileDialogId =
  "address" | "gallery" | "hours" | "specialty" | "team-member" | "treatment"

export type ClinicProfileDialogAvailability = Readonly<{
  canManageProfile: boolean
  showProfileManagement: boolean
  showTeamManagement: boolean
}>

export function isClinicProfileDialogAvailabilityEqual(
  current: ClinicProfileDialogAvailability,
  next: ClinicProfileDialogAvailability,
) {
  return (
    current.canManageProfile === next.canManageProfile &&
    current.showProfileManagement === next.showProfileManagement &&
    current.showTeamManagement === next.showTeamManagement
  )
}

export function isClinicProfileDialogAvailable(
  dialog: ClinicProfileDialogId,
  availability: ClinicProfileDialogAvailability,
) {
  if (dialog === "team-member") return availability.showTeamManagement
  if (dialog === "treatment") return availability.showProfileManagement
  return availability.canManageProfile
}

export function selectAvailableClinicProfileDialog(
  dialog: ClinicProfileDialogId | undefined,
  availability: ClinicProfileDialogAvailability,
) {
  return dialog && isClinicProfileDialogAvailable(dialog, availability) ? dialog : undefined
}
