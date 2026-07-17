"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { PageHeading } from "@/components/ui/page-heading"
import type {
  ClinicProfileDraft,
  ClinicProfileFocusTarget,
  ClinicTeamMember,
  ClinicTreatment,
} from "../../model/clinic-profile"
import { ClinicProfileBasics } from "./ClinicProfileBasics"
import { ClinicProfileDetails } from "./ClinicProfileDetails"
import { ClinicProfileGallery } from "./ClinicProfileGallery"
import { ClinicProfileTeam } from "./ClinicProfileTeam"
import { ClinicProfileTreatments } from "./ClinicProfileTreatments"

export type ClinicProfileScreenModel = Readonly<{
  canManageProfile: boolean
  canManageTeam: boolean
  focusTarget?: ClinicProfileFocusTarget
  isDirty: boolean
  profile: ClinicProfileDraft
  saveState: "idle" | "saved" | "saving"
  showProfileManagement: boolean
  showTeamManagement: boolean
  statusMessage: string
  undoKind?: "team" | "treatment"
  undoMessage?: string
}>

export type ClinicProfileScreenActions = Readonly<{
  onAddressEdit: () => void
  onDescriptionChange: (description: string) => void
  onFocusHandled: () => void
  onGalleryOpen: () => void
  onNameChange: (name: string) => void
  onOpeningHoursEdit: () => void
  onProfileCancel: () => void
  onProfileSave: () => void
  onRemovalUndo: () => void
  onSpecialtyDialogOpen: () => void
  onSpecialtyRemove: (specialty: string) => void
  onTeamMemberCreate: () => void
  onTeamMemberEdit: (member: ClinicTeamMember) => void
  onTeamMemberRemove: (id: string) => void
  onTreatmentCreate: () => void
  onTreatmentEdit: (treatment: ClinicTreatment) => void
  onTreatmentMove: (id: string, direction: -1 | 1) => void
  onTreatmentRemove: (id: string) => void
}>

type ClinicProfileScreenProps = Readonly<{
  actions: ClinicProfileScreenActions
  model: ClinicProfileScreenModel
}>

export function ClinicProfileScreen({ actions, model }: ClinicProfileScreenProps) {
  const galleryRef = useRef<HTMLElement>(null)
  const teamRef = useRef<HTMLElement>(null)
  const isBusy = model.saveState === "saving"
  const isEditingDisabled = !model.canManageProfile || isBusy
  const { onFocusHandled } = actions

  useEffect(() => {
    if (!model.focusTarget) return

    const frame = requestAnimationFrame(() => {
      const target = model.focusTarget === "gallery" ? galleryRef.current : teamRef.current
      if (!target) return

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })
      target.focus({ preventScroll: true })
      onFocusHandled()
    })

    return () => cancelAnimationFrame(frame)
  }, [model.focusTarget, onFocusHandled])

  const saveControls = (
    <>
      <Button disabled={!model.isDirty || isBusy} onClick={actions.onProfileCancel} variant="outline">
        Cancel
      </Button>
      <Button
        disabled={!model.isDirty || isBusy}
        onClick={actions.onProfileSave}
        variant={model.isDirty ? "primary" : "outline"}
      >
        {isBusy ? "Saving…" : "Save changes"}
      </Button>
    </>
  )

  return (
    <div aria-busy={isBusy} className="space-y-6 pb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm text-[var(--foreground)]">Clinics / Edit profile</p>
          <PageHeading>Clinic profile</PageHeading>
        </div>
        {model.canManageProfile ? (
          <div aria-label="Profile page actions" className="flex items-center gap-2" role="group">
            {saveControls}
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {model.statusMessage}
      </p>

      <ClinicProfileGallery
        gallery={model.profile.gallery}
        galleryTotal={model.profile.galleryTotal}
        isDisabled={isEditingDisabled}
        onOpen={actions.onGalleryOpen}
        ref={galleryRef}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <ClinicProfileBasics
            description={model.profile.description}
            isEditingDisabled={isEditingDisabled}
            name={model.profile.name}
            onDescriptionChange={actions.onDescriptionChange}
            onNameChange={actions.onNameChange}
            onSpecialtyAdd={actions.onSpecialtyDialogOpen}
            onSpecialtyRemove={actions.onSpecialtyRemove}
            showSpecialtyActions={model.canManageProfile}
            specialties={model.profile.specialties}
          />
          <ClinicProfileTeam
            isBusy={isBusy}
            members={model.profile.team}
            onCreate={actions.onTeamMemberCreate}
            onEdit={actions.onTeamMemberEdit}
            onRemove={actions.onTeamMemberRemove}
            onUndo={actions.onRemovalUndo}
            ref={teamRef}
            showCreateAction={model.showTeamManagement}
            showMemberActions={model.canManageTeam}
            undoMessage={model.undoKind === "team" ? model.undoMessage : undefined}
          />
          <ClinicProfileTreatments
            isBusy={isBusy}
            onCreate={actions.onTreatmentCreate}
            onEdit={actions.onTreatmentEdit}
            onMove={actions.onTreatmentMove}
            onRemove={actions.onTreatmentRemove}
            onUndo={actions.onRemovalUndo}
            showCreateAction={model.showProfileManagement}
            showTreatmentActions={model.canManageProfile}
            treatments={model.profile.treatments}
            undoMessage={model.undoKind === "treatment" ? model.undoMessage : undefined}
          />
        </div>

        <ClinicProfileDetails
          address={model.profile.address}
          isEditingDisabled={isEditingDisabled}
          onAddressEdit={actions.onAddressEdit}
          onOpeningHoursEdit={actions.onOpeningHoursEdit}
          openingHours={model.profile.openingHours}
          showEditActions={model.canManageProfile}
        />
      </div>

      {model.canManageProfile && model.isDirty ? (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] px-4 py-3 shadow-2xl backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-[100rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold text-[var(--secondary)]">Profile changes not saved</span>
            <div aria-label="Sticky profile actions" className="flex justify-end gap-2" role="group">
              {saveControls}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
