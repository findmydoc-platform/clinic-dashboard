const clinicProfileDestinations = ["gallery", "team"] as const

export type ClinicProfileDestination = (typeof clinicProfileDestinations)[number]

export type DashboardProfileTask = Readonly<{
  actionLabel: string
  description: string
  destination?: ClinicProfileDestination
  destinationLabel?: string
  id: string
  label: string
  priority: "High" | "Low" | "Medium"
  visibility: "always" | "full-interface"
}>

export function hasProfileDestination(
  task: DashboardProfileTask,
): task is DashboardProfileTask & Required<Pick<DashboardProfileTask, "destination" | "destinationLabel">> {
  return Boolean(task.destination && task.destinationLabel)
}
