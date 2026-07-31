"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle, FilePenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeading } from "@/components/ui/page-heading"
import type {
  ClinicProfileDraft,
  ClinicProfileFocusTarget,
  ClinicTreatmentView,
} from "../../model/clinic-profile"
import type {
  ClinicProfileChangeSet,
  ClinicProfileValidationErrors,
} from "../../model/clinic-profile-editing"
import type {
  ClinicProfileDraftInput,
  ClinicProfileSnapshot,
  ClinicProfileSourceFields,
} from "../../model/clinic-profile-source"
import type { DoctorDirectorySnapshot } from "../../model/doctor-profile"
import type { DoctorProfileCommands } from "../../model/doctor-profile-commands"
import {
  isClinicProfileManagementInteractive,
  isClinicProfileManagementVisible,
  type ClinicProfileManagementAccess,
} from "../../model/clinic-profile-management"
import type { ClinicProfileSourceEditorMode } from "../../hooks/useClinicProfileSourceController"
import { ClinicProfileBasics } from "./ClinicProfileBasics"
import { ClinicProfileDetails } from "./ClinicProfileDetails"
import { ClinicProfileGallery } from "./ClinicProfileGallery"
import { ClinicProfileTreatments } from "./ClinicProfileTreatments"
import { DoctorDirectory } from "./DoctorDirectory"

export type ClinicProfileScreenModel = Readonly<{
  doctorCommands: DoctorProfileCommands
  doctorDirectory: DoctorDirectorySnapshot
  doctorManagement: ClinicProfileManagementAccess
  focusTarget?: ClinicProfileFocusTarget
  legacyIsDirty: boolean
  legacyProfile: ClinicProfileDraft
  legacySaveState: "idle" | "saved" | "saving"
  legacyStatusMessage: string
  profileManagement: ClinicProfileManagementAccess
  sourceProfileManagement: ClinicProfileManagementAccess
  source: Readonly<{
    changeSet?: ClinicProfileChangeSet
    displayFields?: ClinicProfileSourceFields
    hasSavedChanges: boolean
    hasSavedDraft: boolean
    isDirty: boolean
    mode: ClinicProfileSourceEditorMode
    operation: "discarding" | "idle" | "loading" | "publishing" | "saving"
    snapshot?: ClinicProfileSnapshot
    statusMessage: string
    validationErrors: ClinicProfileValidationErrors
    workingDraft?: ClinicProfileDraftInput
  }>
  treatments: readonly ClinicTreatmentView[]
  undoKind?: "team" | "treatment"
  undoMessage?: string
}>

export type ClinicProfileScreenActions = Readonly<{
  onAddressEdit: () => void
  onDescriptionChange: (description: string) => void
  onDoctorsChange: (doctors: readonly DoctorDirectorySnapshot["doctors"][number][]) => void
  onFocusHandled: () => void
  onGalleryOpen: () => void
  onLanguagesChange: (languages: ClinicProfileDraftInput["supportedLanguages"]) => void
  onLegacyCancel: () => void
  onLegacySave: () => void
  onNameChange: (name: string) => void
  onOpeningHoursEdit: () => void
  onProfileCancel: () => void
  onProfileEdit: () => void
  onProfileReview: () => void
  onProfileSave: () => void
  onRemovalUndo: () => void
  onSourceDiscard: () => void
  onTreatmentCreate: () => void
  onTreatmentOpen: (treatment: ClinicTreatmentView) => void
  onTreatmentRemove: (id: string) => void
}>

type ClinicProfileScreenProps = Readonly<{
  actions: ClinicProfileScreenActions
  model: ClinicProfileScreenModel
}>

export function ClinicProfileScreen({ actions, model }: ClinicProfileScreenProps) {
  const galleryRef = useRef<HTMLElement>(null)
  const doctorsRef = useRef<HTMLElement>(null)
  const canManageProfile = isClinicProfileManagementInteractive(model.sourceProfileManagement)
  const canManageLegacyProfile = isClinicProfileManagementInteractive(model.profileManagement)
  const canManageDoctors = isClinicProfileManagementInteractive(model.doctorManagement)
  const sourceBusy = model.source.operation !== "idle"
  const legacyBusy = model.legacySaveState === "saving"
  const { onFocusHandled } = actions

  useEffect(() => {
    if (!model.focusTarget) return

    const frame = requestAnimationFrame(() => {
      const target = model.focusTarget === "gallery" ? galleryRef.current : doctorsRef.current
      if (!target) return

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })
      target.focus({ preventScroll: true })
      onFocusHandled()
    })

    return () => cancelAnimationFrame(frame)
  }, [model.focusTarget, onFocusHandled])

  const sourceActions = canManageProfile ? (
    model.source.mode === "view" ? (
      model.source.hasSavedDraft ? (
        <>
          <Button
            disabled={sourceBusy}
            onClick={actions.onProfileEdit}
            variant={model.source.hasSavedChanges ? "outline" : "primary"}
          >
            Continue editing
          </Button>
          {model.source.hasSavedChanges ? (
            <Button disabled={sourceBusy} onClick={actions.onProfileReview}>
              Review &amp; publish
            </Button>
          ) : null}
        </>
      ) : (
        <Button disabled={sourceBusy || !model.source.snapshot} onClick={actions.onProfileEdit}>
          Edit profile
        </Button>
      )
    ) : model.source.mode === "edit" ? (
      model.source.isDirty ? (
        <>
          <Button disabled={sourceBusy} onClick={actions.onProfileCancel} variant="outline">
            Cancel editing
          </Button>
          <Button disabled={sourceBusy} onClick={actions.onProfileSave}>
            {sourceBusy ? "Saving…" : "Save draft"}
          </Button>
        </>
      ) : model.source.hasSavedDraft ? (
        <>
          <Button disabled={sourceBusy} onClick={actions.onSourceDiscard} variant="ghost">
            Discard draft
          </Button>
          <Button disabled={sourceBusy || !model.source.hasSavedChanges} onClick={actions.onProfileReview}>
            Review &amp; publish
          </Button>
        </>
      ) : (
        <Button onClick={actions.onProfileCancel} variant="outline">
          Cancel editing
        </Button>
      )
    ) : null
  ) : null

  return (
    <div aria-busy={sourceBusy || legacyBusy} className="space-y-6 pb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm text-[var(--foreground)]">
            {canManageProfile ? "Clinic workspace · Profile settings" : "Clinic workspace · Profile overview"}
          </p>
          <PageHeading>Clinic profile</PageHeading>
        </div>
        {sourceActions && !(model.source.mode === "edit" && model.source.isDirty) ? (
          <div aria-label="Profile page actions" className="flex flex-wrap items-center gap-2" role="group">
            {sourceActions}
          </div>
        ) : null}
      </div>

      {model.source.mode === "view" && model.source.hasSavedDraft ? (
        <div className="flex items-start gap-3 border-l-4 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_28%,var(--background))] px-4 py-3 text-sm">
          <FilePenLine aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <strong className="text-[var(--secondary)]">Draft available</strong>
            <p className="mt-1">Published profile is shown.</p>
          </div>
        </div>
      ) : null}

      {model.source.mode === "conflict" ? (
        <div
          className="flex flex-col gap-4 border-l-4 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_28%,var(--background))] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <strong className="text-[var(--secondary)]">Profile changed elsewhere</strong>
              <p className="mt-1 text-sm">
                Your local values remain visible and copyable. Reloading replaces them with the latest saved
                version.
              </p>
            </div>
          </div>
          <Button onClick={actions.onSourceDiscard} variant="destructive">
            Reload latest
          </Button>
        </div>
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {model.source.statusMessage || model.legacyStatusMessage}
      </p>

      <ClinicProfileGallery
        gallery={model.legacyProfile.gallery}
        galleryTotal={model.legacyProfile.galleryTotal}
        onOpen={actions.onGalleryOpen}
        ref={galleryRef}
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0 space-y-6">
          {model.source.displayFields ? (
            <ClinicProfileBasics
              description={model.source.displayFields.descriptionText}
              errors={model.source.validationErrors}
              isEditing={model.source.mode === "edit"}
              name={model.source.displayFields.name}
              onDescriptionChange={actions.onDescriptionChange}
              onLanguagesChange={actions.onLanguagesChange}
              onNameChange={actions.onNameChange}
              supportedLanguages={model.source.displayFields.supportedLanguages}
            />
          ) : (
            <Card className="p-6" role="alert">
              <h2 className="text-xl font-bold text-[var(--secondary)]">Profile unavailable</h2>
              <p className="mt-2 text-sm leading-6">
                Published profile details could not be loaded. No demo profile values are shown in their
                place.
              </p>
            </Card>
          )}
          <DoctorDirectory
            canManage={canManageDoctors}
            commands={model.doctorCommands}
            onDoctorsChange={actions.onDoctorsChange}
            ref={doctorsRef}
            snapshot={model.doctorDirectory}
          />
          <ClinicProfileTreatments
            isBusy={legacyBusy}
            onCreate={actions.onTreatmentCreate}
            onRemove={actions.onTreatmentRemove}
            onTreatmentOpen={actions.onTreatmentOpen}
            onUndo={actions.onRemovalUndo}
            showCreateAction={canManageLegacyProfile}
            showTreatmentActions={canManageLegacyProfile}
            showTreatmentViewAction={
              isClinicProfileManagementVisible(model.profileManagement) && !canManageLegacyProfile
            }
            treatments={model.treatments}
            undoMessage={model.undoKind === "treatment" ? model.undoMessage : undefined}
          />
        </div>

        {model.source.displayFields ? (
          <ClinicProfileDetails
            address={model.source.displayFields.address}
            errors={model.source.validationErrors}
            isEditing={model.source.mode === "edit"}
            onAddressEdit={actions.onAddressEdit}
            onOpeningHoursEdit={actions.onOpeningHoursEdit}
            openingHours={model.source.displayFields.openingHours}
          />
        ) : null}
      </div>

      {model.legacyIsDirty && model.source.mode === "view" ? (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] px-4 py-3 shadow-2xl backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-[100rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold text-[var(--secondary)]">
              Gallery or treatment changes not saved
            </span>
            <div className="flex justify-end gap-2">
              <Button disabled={legacyBusy} onClick={actions.onLegacyCancel} variant="outline">
                Cancel
              </Button>
              <Button disabled={legacyBusy} onClick={actions.onLegacySave}>
                {legacyBusy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {model.source.mode === "edit" && model.source.isDirty ? (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] px-4 py-3 shadow-2xl backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-[100rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold text-[var(--secondary)]">Unsaved changes</span>
            <div className="flex justify-end gap-2">{sourceActions}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
