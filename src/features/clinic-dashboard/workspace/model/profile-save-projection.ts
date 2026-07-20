import type { ClinicProfileDraft } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardSnapshot } from "@/features/clinic-dashboard/dashboard/public"

export type ClinicDashboardProfileCompletionRule = Readonly<{
  galleryIncrement: number
  maximum: number
  teamIncrement: number
}>

function getCoverId(profile: ClinicProfileDraft) {
  return profile.gallery.find(({ isCover }) => isCover)?.id
}

export function projectDashboardProfileSave(
  input: Readonly<{
    initialProfile: ClinicProfileDraft
    rule: ClinicDashboardProfileCompletionRule
    savedProfile: ClinicProfileDraft
    snapshot: DashboardSnapshot
  }>,
): DashboardSnapshot {
  const galleryResolved = getCoverId(input.initialProfile) !== getCoverId(input.savedProfile)
  const teamResolved = JSON.stringify(input.initialProfile.team) !== JSON.stringify(input.savedProfile.team)
  const completionIncrease =
    (galleryResolved ? input.rule.galleryIncrement : 0) + (teamResolved ? input.rule.teamIncrement : 0)

  return {
    ...input.snapshot,
    profileCompletion: Math.min(input.snapshot.profileCompletion + completionIncrease, input.rule.maximum),
    profileTasks: input.snapshot.profileTasks.filter(
      ({ destination }) =>
        !(destination === "gallery" && galleryResolved) && !(destination === "team" && teamResolved),
    ),
  }
}
