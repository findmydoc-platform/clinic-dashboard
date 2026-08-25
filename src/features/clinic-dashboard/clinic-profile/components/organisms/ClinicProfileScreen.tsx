"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle, FilePenLine } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeading } from "@/components/ui/page-heading"
import type { ClinicGalleryLoadStatus } from "../../model/clinic-gallery"
import type { ClinicGalleryItem, ClinicProfileFocusTarget } from "../../model/clinic-profile"
import type {
  ClinicProfileChangeSet,
  ClinicProfileValidationErrors,
} from "../../model/clinic-profile-editing"
import type {
  ClinicProfileDraftInput,
  ClinicProfileSnapshot,
  ClinicProfileSourceFields,
} from "../../model/clinic-profile-source"
import type { ClinicTreatmentOffering, ClinicTreatmentsSnapshot } from "../../model/clinic-treatment"
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
  gallery: readonly ClinicGalleryItem[]
  galleryStatus: ClinicGalleryLoadStatus
  galleryTotal: number
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
  treatmentManagement: ClinicProfileManagementAccess
  treatmentSnapshot: ClinicTreatmentsSnapshot
  treatmentStatusMessage: string
  treatmentsBusy: boolean
}>

export type ClinicProfileScreenActions = Readonly<{
  onAddressEdit: () => void
  onDescriptionChange: (description: string) => void
  onDoctorsChange: (doctors: readonly DoctorDirectorySnapshot["doctors"][number][]) => void
  onFocusHandled: () => void
  onGalleryOpen: () => void
  onLanguagesChange: (languages: ClinicProfileDraftInput["supportedLanguages"]) => void
  onNameChange: (name: string) => void
  onOpeningHoursEdit: () => void
  onProfileCancel: () => void
  onProfileEdit: () => void
  onProfileReview: () => void
  onProfileSave: () => void
  onSourceDiscard: () => void
  onTreatmentCreate: () => void
  onTreatmentOpen: (treatment: ClinicTreatmentOffering) => void
  onTreatmentRetry: () => void
}>

type ClinicProfileScreenProps = Readonly<{
  actions: ClinicProfileScreenActions
  model: ClinicProfileScreenModel
}>

export function ClinicProfileScreen({ actions, model }: ClinicProfileScreenProps) {
  const basicsRef = useRef<HTMLDivElement>(null)
  const conflictRef = useRef<HTMLDivElement>(null)
  const reviewReturnFocusRef = useRef<HTMLButtonElement>(null)
  const previousSourceModeRef = useRef(model.source.mode)
  const canManageProfile = isClinicProfileManagementInteractive(model.sourceProfileManagement)
  const canManageDoctors = isClinicProfileManagementInteractive(model.doctorManagement)
  const canManageTreatments = isClinicProfileManagementInteractive(model.treatmentManagement)
  const sourceBusy = model.source.operation !== "idle"
  const { onFocusHandled } = actions

  useEffect(() => {
    const focusTarget = model.focusTarget
    if (!focusTarget) return

    const frame = requestAnimationFrame(() => {
      let target: HTMLElement | null = null
      switch (focusTarget) {
        case "conflict":
          target = model.source.mode === "conflict" ? conflictRef.current : null
          break
        case "basic-information":
          if (model.source.mode === "edit") {
            const basicFields = basicsRef.current
            const draft = model.source.workingDraft
            target = !draft?.name.trim()
              ? (basicFields?.querySelector<HTMLInputElement>("input") ?? null)
              : !draft.descriptionText.trim()
                ? (basicFields?.querySelector<HTMLTextAreaElement>("textarea") ?? null)
                : (basicFields?.querySelector<HTMLInputElement>("input") ?? null)
          }
          break
        case "languages":
          if (model.source.mode === "edit") {
            target = basicsRef.current?.querySelector<HTMLElement>('[role="combobox"]') ?? null
          }
          break
        case "address":
        case "gallery":
        case "opening-hours":
        case "review-publish":
        case "treatments":
          break
        default: {
          const unreachableTarget: never = focusTarget
          throw new Error(`Unknown clinic profile focus target: ${unreachableTarget}`)
        }
      }
      if (!target) return

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })
      target.focus({ preventScroll: true })
      onFocusHandled()
    })

    return () => cancelAnimationFrame(frame)
  }, [model.focusTarget, model.source.mode, model.source.workingDraft, onFocusHandled])

  useEffect(() => {
    const previousMode = previousSourceModeRef.current
    previousSourceModeRef.current = model.source.mode
    if (previousMode !== "review" || model.source.mode === "review") return

    const frame = requestAnimationFrame(() => reviewReturnFocusRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [model.source.mode])

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
            <Button disabled={sourceBusy} onClick={actions.onProfileReview} ref={reviewReturnFocusRef}>
              Review &amp; publish
            </Button>
          ) : null}
        </>
      ) : (
        <Button
          disabled={sourceBusy || !model.source.snapshot}
          onClick={actions.onProfileEdit}
          ref={reviewReturnFocusRef}
        >
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
          <Button
            disabled={sourceBusy || !model.source.hasSavedChanges}
            onClick={actions.onProfileReview}
            ref={reviewReturnFocusRef}
          >
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
    <div aria-busy={sourceBusy} className="space-y-6 pb-6">
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
          className="flex flex-col gap-4 border-l-4 border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_28%,var(--background))] px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:flex-row sm:items-center sm:justify-between"
          ref={conflictRef}
          role="alert"
          tabIndex={-1}
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
          <Button onClick={actions.onSourceDiscard} ref={reviewReturnFocusRef} variant="destructive">
            Reload latest
          </Button>
        </div>
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {model.source.statusMessage}
      </p>

      <ClinicProfileGallery
        gallery={model.gallery}
        galleryTotal={model.galleryTotal}
        onOpen={actions.onGalleryOpen}
        showAction={model.source.mode === "view"}
        status={model.galleryStatus}
      />

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)]">
        <div className="min-w-0 space-y-6">
          {model.source.displayFields ? (
            <div ref={basicsRef}>
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
            </div>
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
            snapshot={model.doctorDirectory}
          />
          {isClinicProfileManagementVisible(model.treatmentManagement) ? (
            <ClinicProfileTreatments
              isBusy={model.treatmentsBusy}
              onCreate={actions.onTreatmentCreate}
              onRetry={actions.onTreatmentRetry}
              onTreatmentOpen={actions.onTreatmentOpen}
              showCreateAction={canManageTreatments}
              showTreatmentActions={canManageTreatments}
              showTreatmentViewAction={!canManageTreatments}
              status={model.treatmentSnapshot.status}
              statusMessage={model.treatmentStatusMessage}
              treatments={model.treatmentSnapshot.status === "ready" ? model.treatmentSnapshot.offerings : []}
            />
          ) : null}
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
