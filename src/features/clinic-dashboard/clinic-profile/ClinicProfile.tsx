"use client"

import { AddressDialog } from "./components/molecules/AddressDialog"
import { GalleryDialog } from "./components/molecules/GalleryDialog"
import { OpeningHoursDialog } from "./components/molecules/OpeningHoursDialog"
import { SpecialtyDialog } from "./components/molecules/SpecialtyDialog"
import {
  ClinicProfileScreen,
  type ClinicProfileScreenActions,
} from "./components/organisms/ClinicProfileScreen"
import { TeamMemberDialog } from "./components/organisms/TeamMemberDialog"
import { TreatmentDialog } from "./components/organisms/TreatmentDialog"
import { useClinicProfileController } from "./hooks/useClinicProfileController"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import type { ClinicProfileDraft, ClinicProfileFocusTarget, MasterTreatment } from "./model/clinic-profile"
import {
  isClinicProfileManagementInteractive,
  isClinicProfileManagementVisible,
  type ClinicProfileManagementAccess,
} from "./model/clinic-profile-management"

export type ClinicProfileProps = Readonly<{
  commands: ClinicProfileCommands
  focusTarget?: ClinicProfileFocusTarget
  initialDialog?: "team-member" | "treatment"
  initialProfile: ClinicProfileDraft
  onFocusHandled: () => void
  onTreatmentMissing?: () => void
  profileManagement: ClinicProfileManagementAccess
  teamManagement: ClinicProfileManagementAccess
  treatmentCatalogue: readonly MasterTreatment[]
}>

export function ClinicProfile({
  commands,
  focusTarget,
  initialDialog,
  initialProfile,
  onFocusHandled,
  onTreatmentMissing,
  profileManagement,
  teamManagement,
  treatmentCatalogue,
}: ClinicProfileProps) {
  const controller = useClinicProfileController({
    commands,
    dialogAvailability: {
      profileManagement,
      teamManagement,
    },
    initialDialog,
    initialProfile,
    treatmentCatalogue,
  })
  const { actions, dialog, model } = controller

  const screenActions: ClinicProfileScreenActions = {
    onAddressEdit: () => actions.openDialog("address"),
    onDescriptionChange: actions.changeDescription,
    onFocusHandled,
    onGalleryOpen: () => actions.openDialog("gallery"),
    onNameChange: actions.changeName,
    onOpeningHoursEdit: () => actions.openDialog("hours"),
    onProfileCancel: actions.cancelChanges,
    onProfileSave: actions.saveChanges,
    onRemovalUndo: actions.undoRemoval,
    onSpecialtyDialogOpen: () => actions.openDialog("specialty"),
    onSpecialtyRemove: actions.removeSpecialty,
    onTeamMemberCreate: () => actions.openTeamMemberDialog(),
    onTeamMemberOpen: actions.openTeamMemberDialog,
    onTeamMemberRemove: actions.removeTeamMember,
    onTreatmentCreate: () => actions.openTreatmentDialog(),
    onTreatmentOpen: actions.openTreatmentDialog,
    onTreatmentRemove: actions.removeTreatment,
  }

  return (
    <>
      <ClinicProfileScreen
        actions={screenActions}
        model={{
          focusTarget,
          profileManagement,
          teamManagement,
          treatments: model.treatmentViews,
          ...model,
        }}
      />
      {dialog === "address" ? (
        <AddressDialog
          address={model.profile.address}
          onOpenChange={(open) => actions.setDialogOpen("address", open)}
          onSave={actions.saveAddress}
          open
        />
      ) : null}
      {dialog === "gallery" ? (
        <GalleryDialog
          gallery={model.profile.gallery}
          isReadOnly={!isClinicProfileManagementInteractive(profileManagement)}
          onOpenChange={(open) => actions.setDialogOpen("gallery", open)}
          onSelectCover={actions.selectGalleryCover}
          open
        />
      ) : null}
      {dialog === "hours" ? (
        <OpeningHoursDialog
          entries={model.profile.openingHours}
          onOpenChange={(open) => actions.setDialogOpen("hours", open)}
          onSave={actions.saveOpeningHours}
          open
        />
      ) : null}
      {dialog === "specialty" ? (
        <SpecialtyDialog
          existing={model.profile.specialties}
          onAdd={actions.addSpecialty}
          onOpenChange={(open) => actions.setDialogOpen("specialty", open)}
          open
        />
      ) : null}
      {dialog === "team-member" &&
      isClinicProfileManagementVisible(teamManagement) &&
      (model.selectedTeamMember || isClinicProfileManagementInteractive(teamManagement)) ? (
        <TeamMemberDialog
          initialMember={model.selectedTeamMember}
          isReadOnly={!isClinicProfileManagementInteractive(teamManagement)}
          key={model.selectedTeamMember?.id ?? "new-team-member"}
          onOpenChange={(open) => actions.setDialogOpen("team-member", open)}
          onSave={actions.saveTeamMember}
          open
        />
      ) : null}
      {dialog === "treatment" &&
      isClinicProfileManagementVisible(profileManagement) &&
      (model.selectedTreatment || isClinicProfileManagementInteractive(profileManagement)) ? (
        <TreatmentDialog
          availableTreatments={model.availableMasterTreatments}
          initialTreatment={model.selectedTreatment}
          isReadOnly={!isClinicProfileManagementInteractive(profileManagement)}
          key={model.selectedTreatment?.masterTreatmentId ?? "new-treatment"}
          onOpenChange={(open) => actions.setDialogOpen("treatment", open)}
          onSave={actions.saveTreatment}
          onTreatmentMissing={onTreatmentMissing}
          open
        />
      ) : null}
    </>
  )
}
