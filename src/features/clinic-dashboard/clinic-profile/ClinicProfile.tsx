"use client"

import { AddressDialog } from "./components/molecules/AddressDialog"
import { GalleryDialog } from "./components/molecules/GalleryDialog"
import { OpeningHoursDialog } from "./components/molecules/OpeningHoursDialog"
import { SpecialtyDialog } from "./components/molecules/SpecialtyDialog"
import {
  ClinicProfileScreen,
  type ClinicProfileScreenActions,
} from "./components/organisms/ClinicProfileScreen"
import { TreatmentDialog } from "./components/organisms/TreatmentDialog"
import { useClinicProfileController } from "./hooks/useClinicProfileController"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import type { ClinicProfileDraft, ClinicProfileFocusTarget, MasterTreatment } from "./model/clinic-profile"
import type { DoctorDirectorySnapshot, DoctorProfile } from "./model/doctor-profile"
import type { DoctorProfileCommands } from "./model/doctor-profile-commands"
import {
  isClinicProfileManagementInteractive,
  isClinicProfileManagementVisible,
  type ClinicProfileManagementAccess,
} from "./model/clinic-profile-management"

export type ClinicProfileProps = Readonly<{
  commands: ClinicProfileCommands
  doctorCommands: DoctorProfileCommands
  doctorDirectory: DoctorDirectorySnapshot
  doctorManagement: ClinicProfileManagementAccess
  focusTarget?: ClinicProfileFocusTarget
  initialDialog?: "treatment"
  initialProfile: ClinicProfileDraft
  onFocusHandled: () => void
  onDoctorsChange?: (doctors: readonly DoctorProfile[]) => void
  onProfileSaved?: (profile: ClinicProfileDraft) => void
  onTreatmentMissing?: () => void
  profileManagement: ClinicProfileManagementAccess
  treatmentCatalogue: readonly MasterTreatment[]
}>

export function ClinicProfile({
  commands,
  doctorCommands,
  doctorDirectory,
  doctorManagement,
  focusTarget,
  initialDialog,
  initialProfile,
  onFocusHandled,
  onDoctorsChange,
  onProfileSaved,
  onTreatmentMissing,
  profileManagement,
  treatmentCatalogue,
}: ClinicProfileProps) {
  const controller = useClinicProfileController({
    commands,
    dialogAvailability: {
      profileManagement,
      teamManagement: "hidden",
    },
    initialDialog,
    initialProfile,
    onProfileSaved,
    treatmentCatalogue,
  })
  const { actions, dialog, model } = controller

  const screenActions: ClinicProfileScreenActions = {
    onAddressEdit: () => actions.openDialog("address"),
    onDescriptionChange: actions.changeDescription,
    onDoctorsChange: (doctors) => onDoctorsChange?.(doctors),
    onFocusHandled,
    onGalleryOpen: () => actions.openDialog("gallery"),
    onNameChange: actions.changeName,
    onOpeningHoursEdit: () => actions.openDialog("hours"),
    onProfileCancel: actions.cancelChanges,
    onProfileSave: actions.saveChanges,
    onRemovalUndo: actions.undoRemoval,
    onSpecialtyDialogOpen: () => actions.openDialog("specialty"),
    onSpecialtyRemove: actions.removeSpecialty,
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
          doctorCommands,
          doctorDirectory,
          doctorManagement,
          profileManagement,
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
