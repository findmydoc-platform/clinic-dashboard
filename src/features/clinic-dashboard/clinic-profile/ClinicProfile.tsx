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
import { useClinicTreatmentsController } from "./hooks/useClinicTreatmentsController"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import type { ClinicProfileDraft, ClinicProfileFocusTarget } from "./model/clinic-profile"
import type { ClinicTreatmentCommands } from "./model/clinic-treatment-commands"
import type { ClinicTreatmentsSnapshot } from "./model/clinic-treatment"
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
  treatmentCommands: ClinicTreatmentCommands
  treatmentManagement: ClinicProfileManagementAccess
  treatmentSnapshot: ClinicTreatmentsSnapshot
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
  treatmentCommands,
  treatmentManagement,
  treatmentSnapshot,
}: ClinicProfileProps) {
  const controller = useClinicProfileController({
    commands,
    dialogAvailability: {
      profileManagement,
      teamManagement: "hidden",
    },
    initialProfile,
    onProfileSaved,
  })
  const treatmentController = useClinicTreatmentsController({
    commands: treatmentCommands,
    initialDialog,
    initialSnapshot: treatmentSnapshot,
    management: treatmentManagement,
  })
  const { actions, dialog, model } = controller
  const treatments = treatmentController.model

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
    onSpecialtyDialogOpen: () => actions.openDialog("specialty"),
    onSpecialtyRemove: actions.removeSpecialty,
    onTreatmentCreate: treatmentController.actions.openCreate,
    onTreatmentOpen: treatmentController.actions.openOffering,
    onTreatmentRetry: treatmentController.actions.reload,
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
          treatmentManagement,
          treatmentSnapshot: treatments.snapshot,
          treatmentStatusMessage: treatments.statusMessage,
          treatmentsBusy: treatments.isBusy,
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
      {treatments.dialogOpen &&
      isClinicProfileManagementVisible(treatmentManagement) &&
      (treatments.selectedOffering || isClinicProfileManagementInteractive(treatmentManagement)) ? (
        <TreatmentDialog
          availableTreatments={treatments.availableTreatments}
          initialTreatment={treatments.selectedOffering}
          isBusy={treatments.isBusy}
          isReadOnly={!isClinicProfileManagementInteractive(treatmentManagement)}
          key={treatments.selectedOffering?.id ?? "new-treatment"}
          message={treatments.dialogMessage}
          onOpenChange={treatmentController.actions.setDialogOpen}
          onSave={treatmentController.actions.save}
          onTreatmentMissing={onTreatmentMissing}
          open
        />
      ) : null}
    </>
  )
}
