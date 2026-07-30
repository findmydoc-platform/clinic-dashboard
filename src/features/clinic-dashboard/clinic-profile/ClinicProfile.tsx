"use client"

import { Button } from "@/components/ui/button"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { AddressDialog } from "./components/molecules/AddressDialog"
import { GalleryDialog } from "./components/molecules/GalleryDialog"
import { OpeningHoursDialog } from "./components/molecules/OpeningHoursDialog"
import {
  ClinicProfileScreen,
  type ClinicProfileScreenActions,
} from "./components/organisms/ClinicProfileScreen"
import { PublishReviewDialog } from "./components/organisms/PublishReviewDialog"
import { TreatmentDialog } from "./components/organisms/TreatmentDialog"
import { useClinicProfileController } from "./hooks/useClinicProfileController"
import { useClinicProfileSourceController } from "./hooks/useClinicProfileSourceController"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import type { ClinicProfileDraft, ClinicProfileFocusTarget, MasterTreatment } from "./model/clinic-profile"
import { resolveClinicProfileDraftInput } from "./model/clinic-profile-editing"
import type { ClinicProfileSnapshot } from "./model/clinic-profile-source"
import type { ClinicProfileSourceCommands } from "./model/clinic-profile-source-commands"
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
  sourceCommands: ClinicProfileSourceCommands
  sourceSnapshot?: ClinicProfileSnapshot
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
  sourceCommands,
  sourceSnapshot,
  treatmentCatalogue,
}: ClinicProfileProps) {
  const legacy = useClinicProfileController({
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
  const source = useClinicProfileSourceController({
    commands: sourceCommands,
    initialSnapshot: sourceSnapshot,
  })
  const { actions: legacyActions, dialog: legacyDialog, model: legacyModel } = legacy
  const { actions: sourceActions, model: sourceModel } = source

  const sourceDisplayFields =
    (sourceModel.mode === "edit" || sourceModel.mode === "conflict") &&
    sourceModel.workingDraft &&
    sourceModel.snapshot
      ? resolveClinicProfileDraftInput(sourceModel.workingDraft, sourceModel.snapshot.availableCities)
      : sourceModel.published

  const screenActions: ClinicProfileScreenActions = {
    onAddressEdit: () => sourceActions.setDialog("address"),
    onDescriptionChange: sourceActions.changeDescription,
    onDoctorsChange: (doctors) => onDoctorsChange?.(doctors),
    onFocusHandled,
    onGalleryOpen: () => legacyActions.openDialog("gallery"),
    onLanguagesChange: sourceActions.changeLanguages,
    onLegacyCancel: legacyActions.cancelChanges,
    onLegacySave: legacyActions.saveChanges,
    onNameChange: sourceActions.changeName,
    onOpeningHoursEdit: () => sourceActions.setDialog("hours"),
    onProfileCancel: sourceActions.requestCancel,
    onProfileEdit: sourceActions.startEditing,
    onProfileReview: sourceActions.requestReview,
    onProfileSave: () => void sourceActions.saveDraft(),
    onRemovalUndo: legacyActions.undoRemoval,
    onSourceDiscard: () =>
      sourceActions.setConfirmation(sourceModel.mode === "conflict" ? "reload" : "discard"),
    onTreatmentCreate: () => legacyActions.openTreatmentDialog(),
    onTreatmentOpen: legacyActions.openTreatmentDialog,
    onTreatmentRemove: legacyActions.removeTreatment,
  }

  return (
    <>
      <ClinicProfileScreen
        actions={screenActions}
        model={{
          doctorCommands,
          doctorDirectory,
          doctorManagement,
          focusTarget,
          legacyIsDirty: legacyModel.isDirty,
          legacyProfile: legacyModel.profile,
          legacySaveState: legacyModel.saveState,
          legacyStatusMessage: legacyModel.statusMessage,
          profileManagement,
          source: {
            changeSet: sourceModel.changeSet,
            displayFields: sourceDisplayFields,
            hasSavedChanges: sourceModel.hasSavedChanges,
            hasSavedDraft: Boolean(sourceModel.snapshot?.draft),
            isDirty: sourceModel.isDirty,
            mode: sourceModel.mode,
            operation: sourceModel.operation,
            snapshot: sourceModel.snapshot,
            statusMessage: sourceModel.statusMessage,
            validationErrors: sourceModel.validationErrors,
            workingDraft: sourceModel.workingDraft,
          },
          treatments: legacyModel.treatmentViews,
          undoKind: legacyModel.undoKind,
          undoMessage: legacyModel.undoMessage,
        }}
      />

      {sourceModel.dialog === "address" && sourceModel.workingDraft && sourceModel.snapshot ? (
        <AddressDialog
          address={sourceModel.workingDraft.address}
          cities={sourceModel.snapshot.availableCities}
          errors={sourceModel.validationErrors}
          onOpenChange={(open) => sourceActions.setDialog(open ? "address" : null)}
          onSave={sourceActions.saveAddress}
          open
        />
      ) : null}
      {sourceModel.dialog === "hours" && sourceModel.workingDraft ? (
        <OpeningHoursDialog
          entries={sourceModel.workingDraft.openingHours}
          errors={sourceModel.validationErrors}
          onOpenChange={(open) => sourceActions.setDialog(open ? "hours" : null)}
          onSave={sourceActions.saveOpeningHours}
          open
        />
      ) : null}

      {legacyDialog === "gallery" ? (
        <GalleryDialog
          gallery={legacyModel.profile.gallery}
          isReadOnly={!isClinicProfileManagementInteractive(profileManagement)}
          onOpenChange={(open) => legacyActions.setDialogOpen("gallery", open)}
          onSelectCover={legacyActions.selectGalleryCover}
          open
        />
      ) : null}
      {legacyDialog === "treatment" &&
      isClinicProfileManagementVisible(profileManagement) &&
      (legacyModel.selectedTreatment || isClinicProfileManagementInteractive(profileManagement)) ? (
        <TreatmentDialog
          availableTreatments={legacyModel.availableMasterTreatments}
          initialTreatment={legacyModel.selectedTreatment}
          isReadOnly={!isClinicProfileManagementInteractive(profileManagement)}
          key={legacyModel.selectedTreatment?.masterTreatmentId ?? "new-treatment"}
          onOpenChange={(open) => legacyActions.setDialogOpen("treatment", open)}
          onSave={legacyActions.saveTreatment}
          onTreatmentMissing={onTreatmentMissing}
          open
        />
      ) : null}

      {sourceModel.mode === "review" && sourceModel.changeSet ? (
        <PublishReviewDialog
          changeSet={sourceModel.changeSet}
          errors={sourceModel.validationErrors}
          isPublishing={sourceModel.operation === "publishing"}
          onBack={() => sourceActions.setMode("edit")}
          onPublish={sourceActions.publishDraft}
          open
          statusMessage={sourceModel.statusMessage}
        />
      ) : null}

      <AlertDialog
        actions={
          <>
            <Button onClick={() => sourceActions.setConfirmation(null)} variant="outline">
              Keep editing
            </Button>
            <Button onClick={sourceActions.leaveWithoutSaving} variant="destructive">
              Leave without saving
            </Button>
            <Button onClick={() => void sourceActions.saveDraft(true)}>Save draft and leave</Button>
          </>
        }
        description="You have local changes that have not been saved as a draft."
        onOpenChange={(open) => {
          if (!open) sourceActions.setConfirmation(null)
        }}
        open={sourceModel.confirmation === "leave"}
        title="Leave profile editing?"
      />
      <AlertDialog
        actions={
          <>
            <Button onClick={() => sourceActions.setConfirmation(null)} variant="outline">
              Keep draft
            </Button>
            <Button onClick={sourceActions.discardDraft} variant="destructive">
              Discard draft
            </Button>
          </>
        }
        description="This permanently removes the saved draft. The published profile remains unchanged."
        onOpenChange={(open) => {
          if (!open) sourceActions.setConfirmation(null)
        }}
        open={sourceModel.confirmation === "discard"}
        title="Discard saved draft?"
      />
      <AlertDialog
        actions={
          <>
            <Button onClick={() => sourceActions.setConfirmation(null)} variant="outline">
              Keep local values
            </Button>
            <Button onClick={sourceActions.reloadLatest} variant="destructive">
              Reload latest
            </Button>
          </>
        }
        description="Reloading replaces the local values shown here with the latest saved profile and draft."
        onOpenChange={(open) => {
          if (!open) sourceActions.setConfirmation(null)
        }}
        open={sourceModel.confirmation === "reload"}
        title="Replace local values?"
      />
    </>
  )
}
