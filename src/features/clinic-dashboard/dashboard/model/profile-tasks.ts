import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"

type DashboardProfileTaskBase = Readonly<{
  actionLabel: string
  description: string
  destination: ClinicProfileFocusTarget
  destinationLabel: string
  id: string
  label: string
}>

export type DashboardProfileCategoryTask = DashboardProfileTaskBase &
  Readonly<{
    areaId: "address" | "basic-information" | "clinic-images" | "languages" | "opening-hours" | "treatments"
    benefit: string
    completionCriteria: string
    guidance?: string
    kind: "category"
    missingItems: readonly string[]
  }>

export type DashboardProfileDraftTask = DashboardProfileTaskBase &
  (
    | Readonly<{
        completedAreaCount: number
        completionCriteria: string
        kind: "complete-draft"
        missingItems: readonly string[]
        totalAreaCount: 4
      }>
    | Readonly<{
        changedItems: readonly string[]
        kind: "publish-draft"
      }>
    | Readonly<{
        kind: "review-draft"
      }>
  )

export type DashboardProfileTask = DashboardProfileCategoryTask | DashboardProfileDraftTask
