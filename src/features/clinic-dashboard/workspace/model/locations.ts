export const clinicDashboardLocationIds = ["berlin-mitte", "berlin-charlottenburg", "potsdam"] as const

export type ClinicDashboardLocationId = (typeof clinicDashboardLocationIds)[number]

export const defaultClinicDashboardLocationId = "berlin-mitte" satisfies ClinicDashboardLocationId

export type ClinicDashboardPrototypeLocation = Readonly<{
  id: ClinicDashboardLocationId
  location: string
  name: string
  selectorLabel: string
}>

export type ClinicDashboardLocationSelectionAction = Readonly<{
  locationId: ClinicDashboardLocationId
  type: "location-selected"
}>

export function isClinicDashboardLocationId(value: string): value is ClinicDashboardLocationId {
  return clinicDashboardLocationIds.includes(value as ClinicDashboardLocationId)
}

export function clinicDashboardLocationSelectionReducer(
  _currentLocationId: ClinicDashboardLocationId,
  action: ClinicDashboardLocationSelectionAction,
): ClinicDashboardLocationId {
  return action.locationId
}

export function getClinicDashboardPrototypeLocation(
  locations: readonly ClinicDashboardPrototypeLocation[],
  locationId: ClinicDashboardLocationId,
) {
  const location = locations.find(({ id }) => id === locationId)

  if (!location) {
    throw new Error(`Missing clinic dashboard prototype location: ${locationId}`)
  }

  return location
}
