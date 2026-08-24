"use client"

import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { AddressDialog } from "./components/molecules/AddressDialog"
import { ClinicGalleryManagerDialog } from "./components/organisms/ClinicGalleryManagerDialog"
import { OpeningHoursDialog } from "./components/molecules/OpeningHoursDialog"
import {
  ClinicProfileScreen,
  type ClinicProfileScreenActions,
} from "./components/organisms/ClinicProfileScreen"
import { PublishReviewDialog } from "./components/organisms/PublishReviewDialog"
import { TreatmentDialog } from "./components/organisms/TreatmentDialog"
import { useClinicProfileController } from "./hooks/useClinicProfileController"
import { useClinicGalleryController } from "./hooks/useClinicGalleryController"
import { useClinicProfileSourceController } from "./hooks/useClinicProfileSourceController"
import { useClinicTreatmentsController } from "./hooks/useClinicTreatmentsController"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import type { ClinicGalleryCommands } from "./model/clinic-gallery-commands"
import type { ClinicGalleryLoadStatus, ClinicGallerySnapshot } from "./model/clinic-gallery"
import type { ClinicProfileDraft, ClinicProfileFocusTarget } from "./model/clinic-profile"
import { resolveClinicProfileDraftInput } from "./model/clinic-profile-editing"
import type { ClinicProfileSnapshot } from "./model/clinic-profile-source"
import type { ClinicProfileSourceCommands } from "./model/clinic-profile-source-commands"
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
  galleryCommands: ClinicGalleryCommands
  galleryManagement: ClinicProfileManagementAccess
  galleryStatus: ClinicGalleryLoadStatus
  gallerySnapshot?: ClinicGallerySnapshot
  doctorCommands: DoctorProfileCommands
  doctorDirectory: DoctorDirectorySnapshot
  doctorManagement: ClinicProfileManagementAccess
  focusTarget?: ClinicProfileFocusTarget
  initialDialog?: "treatment"
  initialProfile: ClinicProfileDraft
  onFocusHandled: () => void
  onGallerySaved?: (snapshot: ClinicGallerySnapshot) => void
  onGalleryNavigationRequestChange?: (request?: (continuation: () => void) => void) => void
  onDoctorsChange?: (doctors: readonly DoctorProfile[]) => void
  onProfileSaved?: (profile: ClinicProfileDraft) => void
  onSourceProfileChanged?: (snapshot: ClinicProfileSnapshot) => void
  onTreatmentMissing?: () => void
  onTreatmentSaved?: (snapshot: ClinicTreatmentsSnapshot) => void
  profileManagement: ClinicProfileManagementAccess
  sourceProfileManagement: ClinicProfileManagementAccess
  sourceCommands: ClinicProfileSourceCommands
  sourceSnapshot?: ClinicProfileSnapshot
  treatmentCommands: ClinicTreatmentCommands
  treatmentManagement: ClinicProfileManagementAccess
  treatmentSnapshot: ClinicTreatmentsSnapshot
}>

export function ClinicProfile({
  commands,
  galleryCommands,
  galleryManagement,
  galleryStatus,
  gallerySnapshot,
  doctorCommands,
  doctorDirectory,
  doctorManagement,
  focusTarget,
  initialDialog,
  initialProfile,
  onFocusHandled,
  onGallerySaved,
  onGalleryNavigationRequestChange,
  onDoctorsChange,
  onProfileSaved,
  onSourceProfileChanged,
  onTreatmentMissing,
  onTreatmentSaved,
  profileManagement,
  sourceProfileManagement,
  sourceCommands,
  sourceSnapshot,
  treatmentCommands,
  treatmentManagement,
  treatmentSnapshot,
}: ClinicProfileProps) {
  const handleGallerySaved = useCallback(
    (snapshot: ClinicGallerySnapshot) => {
      onGallerySaved?.(snapshot)
      toast.success("Gallery saved.")
    },
    [onGallerySaved],
  )
  const legacy = useClinicProfileController({
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
    onSaved: onTreatmentSaved,
  })
  const galleryController = useClinicGalleryController({
    commands: galleryCommands,
    initialSnapshot: gallerySnapshot,
    management: galleryManagement,
    onSaved: handleGallerySaved,
  })
  useEffect(() => {
    onGalleryNavigationRequestChange?.(
      galleryController.model.open ? galleryController.actions.requestNavigation : undefined,
    )
    return () => onGalleryNavigationRequestChange?.(undefined)
  }, [
    galleryController.actions.requestNavigation,
    galleryController.model.open,
    onGalleryNavigationRequestChange,
  ])
  const source = useClinicProfileSourceController({
    commands: sourceCommands,
    initialSnapshot: sourceSnapshot,
    onSnapshotChanged: onSourceProfileChanged,
  })
  const { actions: legacyActions, model: legacyModel } = legacy
  const { actions: sourceActions, model: sourceModel } = source
  const openGallery = galleryController.actions.openGallery
  const openTreatmentCreate = treatmentController.actions.openCreate
  const requestProfileReview = sourceActions.requestReview
  const setProfileDialog = sourceActions.setDialog
  const setProfileMode = sourceActions.setMode
  const startProfileEditing = sourceActions.startEditing
  const effectiveGalleryStatus = galleryController.model.snapshot ? "ready" : galleryStatus
  const isSavingFromLeaveDialog = sourceModel.confirmation === "leave" && sourceModel.operation === "saving"

  const sourceDisplayFields =
    (sourceModel.mode === "edit" || sourceModel.mode === "conflict") &&
    sourceModel.workingDraft &&
    sourceModel.snapshot
      ? resolveClinicProfileDraftInput(sourceModel.workingDraft, sourceModel.snapshot.availableCities)
      : sourceModel.published
  const treatments = treatmentController.model

  useEffect(() => {
    if (!focusTarget) return

    switch (focusTarget) {
      case "doctors":
      case "conflict":
        return
      case "basic-information":
      case "languages":
        if (!isClinicProfileManagementInteractive(sourceProfileManagement) || !sourceModel.snapshot) {
          return
        }
        if (sourceModel.mode === "view") startProfileEditing()
        if (sourceModel.mode === "review") setProfileMode("edit")
        return
      case "address":
      case "opening-hours": {
        if (!isClinicProfileManagementInteractive(sourceProfileManagement) || !sourceModel.snapshot) {
          return
        }
        if (sourceModel.mode === "view") {
          startProfileEditing()
          return
        }
        if (sourceModel.mode === "review") {
          setProfileMode("edit")
          return
        }
        if (sourceModel.mode !== "edit") return
        setProfileDialog(focusTarget === "address" ? "address" : "hours")
        onFocusHandled()
        return
      }
      case "gallery":
        if (!isClinicProfileManagementVisible(galleryManagement)) return
        openGallery()
        onFocusHandled()
        return
      case "treatments":
        if (
          !isClinicProfileManagementInteractive(treatmentManagement) ||
          treatments.snapshot.status !== "ready"
        ) {
          return
        }
        openTreatmentCreate()
        onFocusHandled()
        return
      case "review-publish":
        if (!isClinicProfileManagementInteractive(sourceProfileManagement) || !sourceModel.snapshot) {
          return
        }
        if (sourceModel.mode === "review") {
          onFocusHandled()
          return
        }
        if (sourceModel.mode !== "conflict") requestProfileReview()
        return
      default: {
        const unreachableTarget: never = focusTarget
        throw new Error(`Unknown clinic profile focus target: ${unreachableTarget}`)
      }
    }
  }, [
    focusTarget,
    galleryManagement,
    onFocusHandled,
    openGallery,
    openTreatmentCreate,
    requestProfileReview,
    setProfileDialog,
    setProfileMode,
    sourceModel.mode,
    sourceModel.snapshot,
    sourceProfileManagement,
    startProfileEditing,
    treatmentManagement,
    treatments.snapshot.status,
  ])

  const screenActions: ClinicProfileScreenActions = {
    onAddressEdit: () => sourceActions.setDialog("address"),
    onDescriptionChange: sourceActions.changeDescription,
    onDoctorsChange: (doctors) => onDoctorsChange?.(doctors),
    onFocusHandled,
    onGalleryOpen: galleryController.actions.openGallery,
    onLanguagesChange: sourceActions.changeLanguages,
    onLegacyCancel: legacyActions.cancelChanges,
    onLegacySave: legacyActions.saveChanges,
    onNameChange: sourceActions.changeName,
    onOpeningHoursEdit: () => sourceActions.setDialog("hours"),
    onProfileCancel: sourceActions.requestCancel,
    onProfileEdit: sourceActions.startEditing,
    onProfileReview: sourceActions.requestReview,
    onProfileSave: () => void sourceActions.saveDraft(),
    onSourceDiscard: () =>
      sourceActions.setConfirmation(sourceModel.mode === "conflict" ? "reload" : "discard"),
    onTreatmentCreate: treatmentController.actions.openCreate,
    onTreatmentOpen: treatmentController.actions.openOffering,
    onTreatmentRetry: treatmentController.actions.reload,
  }

  return (
    <>
      {!galleryController.model.open ? (
        <ClinicProfileScreen
          actions={screenActions}
          model={{
            doctorCommands,
            doctorDirectory,
            doctorManagement,
            focusTarget,
            galleryStatus: effectiveGalleryStatus,
            legacyIsDirty: legacyModel.isDirty,
            legacyProfile:
              effectiveGalleryStatus === "ready" && galleryController.model.snapshot
                ? {
                    ...legacyModel.profile,
                    gallery: galleryController.model.snapshot.items.slice(0, 5).map((item, index) => ({
                      alt: item.alt,
                      id: item.id,
                      isCover: index === 0,
                      src: item.thumbnailUrl ?? item.url,
                    })),
                    galleryTotal: galleryController.model.snapshot.items.length,
                  }
                : effectiveGalleryStatus === "ready"
                  ? legacyModel.profile
                  : { ...legacyModel.profile, gallery: [], galleryTotal: 0 },
            legacySaveState: legacyModel.saveState,
            legacyStatusMessage: legacyModel.statusMessage,
            profileManagement,
            sourceProfileManagement,
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
            treatmentManagement,
            treatmentSnapshot: treatments.snapshot,
            treatmentStatusMessage: treatments.statusMessage,
            treatmentsBusy: treatments.isBusy,
          }}
        />
      ) : null}

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

      <ClinicGalleryManagerDialog controller={galleryController} />
      {treatments.dialogOpen &&
      isClinicProfileManagementVisible(treatmentManagement) &&
      (treatments.selectedOffering || isClinicProfileManagementInteractive(treatmentManagement)) ? (
        <TreatmentDialog
          availableTreatments={treatments.availableTreatments}
          initialTreatment={treatments.selectedOffering}
          isBusy={treatments.isBusy}
          isReadOnly={!isClinicProfileManagementInteractive(treatmentManagement)}
          message={treatments.dialogMessage}
          onOpenChange={treatmentController.actions.setDialogOpen}
          onSave={treatmentController.actions.save}
          onTreatmentMissing={onTreatmentMissing}
          open
        />
      ) : null}

      {sourceModel.mode === "review" && sourceModel.changeSet ? (
        <PublishReviewDialog
          changeSet={sourceModel.changeSet}
          errors={sourceModel.validationErrors}
          isResolvingOutcome={sourceModel.operation === "loading"}
          isPublishing={sourceModel.operation === "publishing"}
          onBack={() => sourceActions.setMode("edit")}
          onPublish={sourceActions.publishDraft}
          onResolveOutcome={sourceActions.resolvePublishOutcome}
          open
          outcomeUnresolved={sourceModel.publishOutcomeUnresolved}
          statusMessage={sourceModel.statusMessage}
        />
      ) : null}

      <AlertDialog
        actions={
          <>
            <Button
              disabled={isSavingFromLeaveDialog}
              onClick={() => sourceActions.setConfirmation(null)}
              variant="outline"
            >
              Keep editing
            </Button>
            <Button
              disabled={isSavingFromLeaveDialog}
              onClick={sourceActions.leaveWithoutSaving}
              variant="destructive"
            >
              Leave without saving
            </Button>
            <Button disabled={isSavingFromLeaveDialog} onClick={() => void sourceActions.saveDraft(true)}>
              {isSavingFromLeaveDialog ? "Saving…" : "Save draft and leave"}
            </Button>
          </>
        }
        description={
          <span className="grid gap-3">
            <span>You have local changes that have not been saved as a draft.</span>
            {sourceModel.confirmation === "leave" && sourceModel.statusMessage ? (
              <span
                className="border-l-4 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_28%,var(--background))] px-3 py-2 text-[var(--secondary)]"
                role="alert"
              >
                {sourceModel.statusMessage}
              </span>
            ) : null}
          </span>
        }
        onOpenChange={(open) => {
          if (!open && !isSavingFromLeaveDialog) sourceActions.setConfirmation(null)
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
