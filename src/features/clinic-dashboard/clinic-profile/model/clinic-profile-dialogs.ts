import {
  isClinicProfileManagementInteractive,
  isClinicProfileManagementVisible,
  type ClinicProfileManagementAccess,
} from "./clinic-profile-management"

export type ClinicProfileDialogId = "address" | "gallery" | "hours" | "specialty" | "team-member"

export type ClinicProfileDialogAvailability = Readonly<{
  profileManagement: ClinicProfileManagementAccess
  teamManagement: ClinicProfileManagementAccess
}>

export function isClinicProfileDialogAvailabilityEqual(
  current: ClinicProfileDialogAvailability,
  next: ClinicProfileDialogAvailability,
) {
  return (
    current.profileManagement === next.profileManagement && current.teamManagement === next.teamManagement
  )
}

export function isClinicProfileDialogAvailable(
  dialog: ClinicProfileDialogId,
  availability: ClinicProfileDialogAvailability,
  hasSelectedEntity = false,
) {
  if (dialog === "gallery") return true
  if (dialog === "team-member") {
    return (
      isClinicProfileManagementInteractive(availability.teamManagement) ||
      (hasSelectedEntity && isClinicProfileManagementVisible(availability.teamManagement))
    )
  }
  return isClinicProfileManagementInteractive(availability.profileManagement)
}

export function selectAvailableClinicProfileDialog(
  dialog: ClinicProfileDialogId | undefined,
  availability: ClinicProfileDialogAvailability,
  hasSelectedEntity = false,
) {
  return dialog && isClinicProfileDialogAvailable(dialog, availability, hasSelectedEntity)
    ? dialog
    : undefined
}
