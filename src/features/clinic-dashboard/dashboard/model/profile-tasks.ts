import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"

export type DashboardProfileTask = Readonly<{
  actionLabel: string
  description: string
  destination?: ClinicProfileFocusTarget
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
