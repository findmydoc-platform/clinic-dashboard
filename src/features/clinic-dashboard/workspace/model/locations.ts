export type ClinicDashboardLocationId = string

export type ClinicDashboardLocation = Readonly<{
  id: ClinicDashboardLocationId
  location: string
  name: string
  selectorLabel: string
}>

export type ClinicDashboardLocationSelectionAction = Readonly<{
  locationId: ClinicDashboardLocationId
  type: "location-selected"
}>

export function clinicDashboardLocationSelectionReducer(
  _currentLocationId: ClinicDashboardLocationId,
  action: ClinicDashboardLocationSelectionAction,
): ClinicDashboardLocationId {
  return action.locationId
}

export function getClinicDashboardLocation(
  locations: readonly ClinicDashboardLocation[],
  locationId: ClinicDashboardLocationId,
) {
  const location = locations.find(({ id }) => id === locationId)

  if (!location) {
    throw new Error(`Missing clinic dashboard location: ${locationId}`)
  }

  return location
}
