import { isClinicProfileDirty, type ClinicProfileDraft } from "./clinic-profile"
import {
  isClinicProfileManagementInteractive,
  type ClinicProfileManagementAccess,
} from "./clinic-profile-management"
import type { ClinicProfileEditorState } from "./clinic-profile.reducer"

type ClinicProfileEditorProjection = Readonly<{
  isDirty: boolean
  profile: ClinicProfileDraft
  saveState: ClinicProfileEditorState["saveState"]
  statusMessage: string
  undoKind?: "team"
  undoMessage?: string
}>

type ClinicProfileEditorProjectionAccess = Readonly<{
  profileManagement: ClinicProfileManagementAccess
  teamManagement: ClinicProfileManagementAccess
}>

export function selectClinicProfileEditorProjection(
  editor: ClinicProfileEditorState,
  access: ClinicProfileEditorProjectionAccess,
): ClinicProfileEditorProjection {
  const canManageProfile = isClinicProfileManagementInteractive(access.profileManagement)
  const canManageTeam = isClinicProfileManagementInteractive(access.teamManagement)
  const profileSource = canManageProfile ? editor.draft : editor.saved
  const profile = canManageTeam
    ? { ...profileSource, team: editor.draft.team }
    : { ...profileSource, team: editor.saved.team }
  const canManageProjectedProfile = canManageProfile || canManageTeam
  const canUndo = editor.undo?.kind === "team" && canManageTeam
  const undoName = editor.undo?.item.name

  return {
    isDirty: canManageProjectedProfile && isClinicProfileDirty(editor.saved, profile),
    profile,
    saveState: canManageProjectedProfile ? editor.saveState : "idle",
    statusMessage: canManageProjectedProfile ? editor.statusMessage : "",
    undoKind: canUndo ? editor.undo?.kind : undefined,
    undoMessage: canUndo && undoName ? `${undoName} removed. Undo restores this item.` : undefined,
  }
}
