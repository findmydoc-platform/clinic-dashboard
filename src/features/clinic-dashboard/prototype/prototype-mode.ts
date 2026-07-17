const clinicDashboardPrototypeModes = ["visual-reference", "presentation"] as const

export type ClinicDashboardPrototypeMode = (typeof clinicDashboardPrototypeModes)[number]

export function isClinicDashboardPrototypeMode(value: string): value is ClinicDashboardPrototypeMode {
  return clinicDashboardPrototypeModes.includes(value as ClinicDashboardPrototypeMode)
}
