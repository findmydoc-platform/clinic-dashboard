import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardSnapshot } from "@/features/clinic-dashboard/dashboard/public"
import {
  projectDashboardProfileSave,
  type ClinicDashboardProfileCompletionRule,
} from "../workspace/model/profile-save-projection"

const demoProfileCompletionRules: Readonly<Record<string, ClinicDashboardProfileCompletionRule>> = {
  "antalya-lara": { galleryIncrement: 8, maximum: 80, teamIncrement: 8 },
  "istanbul-levent": { galleryIncrement: 4, maximum: 90, teamIncrement: 4 },
  "izmir-alsancak": { galleryIncrement: 3, maximum: 97, teamIncrement: 3 },
}

export function projectDemoDashboardAfterProfileSave(
  input: Readonly<{
    initialProfile: ClinicProfileDraft
    locationId: string
    savedProfile: ClinicProfileDraft
    snapshot: DashboardSnapshot
  }>,
): DashboardSnapshot {
  const rule = demoProfileCompletionRules[input.locationId]
  if (!rule) return input.snapshot

  return projectDashboardProfileSave({ ...input, rule })
}
