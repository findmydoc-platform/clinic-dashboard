"use client"

import { useCallback, useReducer, useState } from "react"
import type {
  ClinicProfileDraft,
  ClinicTeamMember,
  ClinicTeamMemberInput,
  ClinicTreatmentInput,
  ClinicTreatmentView,
  MasterTreatment,
} from "../model/clinic-profile"
import type { ClinicProfileCommands } from "../model/clinic-profile-commands"
import {
  isClinicProfileDialogAvailable,
  isClinicProfileDialogAvailabilityEqual,
  selectAvailableClinicProfileDialog,
  type ClinicProfileDialogAvailability,
  type ClinicProfileDialogId,
} from "../model/clinic-profile-dialogs"
import { clinicProfileEditorReducer, createClinicProfileEditorState } from "../model/clinic-profile.reducer"
import { isClinicProfileManagementInteractive } from "../model/clinic-profile-management"
import { selectClinicProfileEditorProjection } from "../model/clinic-profile.selectors"
import {
  getClinicTreatmentSaveError,
  selectAvailableMasterTreatments,
  selectClinicTreatmentViews,
} from "../model/clinic-treatments"

type UseClinicProfileControllerOptions = Readonly<{
  commands: ClinicProfileCommands
  dialogAvailability: ClinicProfileDialogAvailability
  initialDialog?: Extract<ClinicProfileDialogId, "team-member" | "treatment">
  initialProfile: ClinicProfileDraft
  onProfileSaved?: (profile: ClinicProfileDraft) => void
  treatmentCatalogue: readonly MasterTreatment[]
}>

type ClinicProfileDialogState = Readonly<{
  availability: ClinicProfileDialogAvailability
  requestedDialog?: ClinicProfileDialogId
  selectedTeamMemberId?: string
  selectedTreatmentMasterId?: string
}>

export function useClinicProfileController({
  commands,
  dialogAvailability,
  initialDialog,
  initialProfile,
  onProfileSaved,
  treatmentCatalogue,
}: UseClinicProfileControllerOptions) {
  const [editor, dispatch] = useReducer(
    clinicProfileEditorReducer,
    {
      initialProfile,
      treatmentCatalogue,
    },
    ({ initialProfile: profile, treatmentCatalogue: catalogue }) =>
      createClinicProfileEditorState(profile, catalogue),
  )
  const [dialogState, setDialogState] = useState<ClinicProfileDialogState>(() => ({
    availability: dialogAvailability,
    requestedDialog: selectAvailableClinicProfileDialog(initialDialog, dialogAvailability),
  }))
  const hasCurrentDialogAvailability = isClinicProfileDialogAvailabilityEqual(
    dialogState.availability,
    dialogAvailability,
  )

  if (!hasCurrentDialogAvailability) {
    setDialogState({ availability: dialogAvailability })
  }

  const activeDialogState: ClinicProfileDialogState = hasCurrentDialogAvailability
    ? dialogState
    : { availability: dialogAvailability }
  const canManageProfile = isClinicProfileManagementInteractive(dialogAvailability.profileManagement)
  const canManageTeam = isClinicProfileManagementInteractive(dialogAvailability.teamManagement)
  const projection = selectClinicProfileEditorProjection(editor, dialogAvailability)
  const selectedTeamMember = projection.profile.team.find(
    (member) => member.id === activeDialogState.selectedTeamMemberId,
  )
  const treatmentViews = selectClinicTreatmentViews(editor.treatmentCatalogue, projection.profile.treatments)
  const availableMasterTreatments = selectAvailableMasterTreatments(
    editor.treatmentCatalogue,
    projection.profile.treatments,
  )
  const selectedTreatment = treatmentViews.find(
    (treatment) => treatment.masterTreatmentId === activeDialogState.selectedTreatmentMasterId,
  )
  const hasSelectedDialogEntity =
    activeDialogState.requestedDialog === "team-member"
      ? Boolean(selectedTeamMember)
      : activeDialogState.requestedDialog === "treatment"
        ? Boolean(selectedTreatment)
        : false
  const dialog = selectAvailableClinicProfileDialog(
    activeDialogState.requestedDialog,
    dialogAvailability,
    hasSelectedDialogEntity,
  )

  const changeDraft = useCallback(
    (profile: ClinicProfileDraft, message?: string) => {
      if (!canManageProfile) return
      dispatch({ message, profile, type: "draftChanged" })
    },
    [canManageProfile],
  )

  const cancelChanges = useCallback(() => {
    if (!canManageProfile && !canManageTeam) return
    dispatch({ type: "changesCancelled" })
  }, [canManageProfile, canManageTeam])

  const changeDescription = useCallback(
    (description: string) => {
      if (!canManageProfile) return
      dispatch({ description, type: "descriptionChanged" })
    },
    [canManageProfile],
  )

  const changeName = useCallback(
    (name: string) => {
      if (!canManageProfile) return
      dispatch({ name, type: "nameChanged" })
    },
    [canManageProfile],
  )

  const removeSpecialty = useCallback(
    (specialty: string) => {
      if (!canManageProfile) return
      dispatch({ specialty, type: "specialtyRemoved" })
    },
    [canManageProfile],
  )

  const saveChanges = useCallback(async () => {
    if ((!canManageProfile && !canManageTeam) || !projection.isDirty) return

    dispatch({ type: "saveStarted" })
    try {
      const profile = await commands.saveClinicProfile(projection.profile)
      dispatch({ profile, type: "saveSucceeded" })
      onProfileSaved?.(profile)
    } catch {
      dispatch({ type: "saveFailed" })
    }
  }, [canManageProfile, canManageTeam, commands, onProfileSaved, projection])

  const saveTeamMember = useCallback(
    (input: ClinicTeamMemberInput) => {
      if (!canManageTeam) return
      const editingId = activeDialogState.selectedTeamMemberId
      const member = {
        ...input,
        id: editingId ?? commands.createClinicProfileEntityId("team"),
      }
      dispatch({ editingId, member, type: "teamMemberSaved" })
      setDialogState((current) => ({ ...current, selectedTeamMemberId: undefined }))
    },
    [activeDialogState.selectedTeamMemberId, canManageTeam, commands],
  )

  const saveTreatment = useCallback(
    (input: ClinicTreatmentInput) => {
      if (!canManageProfile) return false
      const editingMasterTreatmentId = activeDialogState.selectedTreatmentMasterId
      const saveError = getClinicTreatmentSaveError(
        editor.treatmentCatalogue,
        editor.draft.treatments,
        input,
        editingMasterTreatmentId,
      )
      dispatch({
        editingMasterTreatmentId,
        treatment: input,
        type: "treatmentSaved",
      })
      if (saveError) return false
      setDialogState((current) => ({ ...current, selectedTreatmentMasterId: undefined }))
      return true
    },
    [
      activeDialogState.selectedTreatmentMasterId,
      canManageProfile,
      editor.draft.treatments,
      editor.treatmentCatalogue,
    ],
  )

  const isDialogAvailable = useCallback(
    (dialogId: ClinicProfileDialogId, hasSelectedEntity = false) =>
      isClinicProfileDialogAvailable(dialogId, dialogAvailability, hasSelectedEntity),
    [dialogAvailability],
  )

  const openTeamMemberDialog = useCallback(
    (member?: ClinicTeamMember) => {
      const selectedMember = member ? projection.profile.team.find(({ id }) => id === member.id) : undefined
      if (!isDialogAvailable("team-member", Boolean(selectedMember))) return
      setDialogState({
        availability: dialogAvailability,
        requestedDialog: "team-member",
        selectedTeamMemberId: selectedMember?.id,
      })
    },
    [dialogAvailability, isDialogAvailable, projection.profile.team],
  )

  const openTreatmentDialog = useCallback(
    (treatment?: ClinicTreatmentView) => {
      const selectedTreatment = treatment
        ? projection.profile.treatments.find(
            ({ masterTreatmentId }) => masterTreatmentId === treatment.masterTreatmentId,
          )
        : undefined
      if (!isDialogAvailable("treatment", Boolean(selectedTreatment))) return
      setDialogState({
        availability: dialogAvailability,
        requestedDialog: "treatment",
        selectedTreatmentMasterId: selectedTreatment?.masterTreatmentId,
      })
    },
    [dialogAvailability, isDialogAvailable, projection.profile.treatments],
  )

  const setDialogOpen = useCallback(
    (dialogId: ClinicProfileDialogId, open: boolean) => {
      if (open) {
        const hasSelectedEntity =
          dialogId === "team-member"
            ? Boolean(selectedTeamMember)
            : dialogId === "treatment"
              ? Boolean(selectedTreatment)
              : false
        if (isDialogAvailable(dialogId, hasSelectedEntity)) {
          setDialogState({ availability: dialogAvailability, requestedDialog: dialogId })
        }
        return
      }

      setDialogState((current) =>
        current.requestedDialog === dialogId ? { availability: dialogAvailability } : current,
      )
    },
    [dialogAvailability, isDialogAvailable, selectedTeamMember, selectedTreatment],
  )

  const openDialog = useCallback(
    (dialogId: Exclude<ClinicProfileDialogId, "team-member" | "treatment">) => {
      if (isDialogAvailable(dialogId)) {
        setDialogState({ availability: dialogAvailability, requestedDialog: dialogId })
      }
    },
    [dialogAvailability, isDialogAvailable],
  )

  const removeTeamMember = useCallback(
    (id: string) => {
      if (!canManageTeam) return
      dispatch({ id, type: "teamMemberRemoved" })
    },
    [canManageTeam],
  )

  const removeTreatment = useCallback(
    (id: string) => {
      if (!canManageProfile) return
      dispatch({ id, type: "treatmentRemoved" })
    },
    [canManageProfile],
  )

  const undoRemoval = useCallback(() => {
    if (editor.undo?.kind === "team" ? !canManageTeam : !canManageProfile) return
    dispatch({ type: "removalUndone" })
  }, [canManageProfile, canManageTeam, editor.undo?.kind])

  const addSpecialty = useCallback(
    (specialty: string) => {
      if (!canManageProfile) return
      dispatch({ specialty, type: "specialtyAdded" })
    },
    [canManageProfile],
  )

  const selectGalleryCover = useCallback(
    (id: string) => {
      if (!canManageProfile) return
      changeDraft(
        {
          ...editor.draft,
          gallery: editor.draft.gallery.map((item) => ({ ...item, isCover: item.id === id })),
        },
        "Gallery cover staged.",
      )
    },
    [canManageProfile, changeDraft, editor.draft],
  )

  const saveAddress = useCallback(
    (address: ClinicProfileDraft["address"]) => {
      if (!canManageProfile) return
      changeDraft({ ...editor.draft, address }, "Address changes staged.")
    },
    [canManageProfile, changeDraft, editor.draft],
  )

  const saveOpeningHours = useCallback(
    (openingHours: ClinicProfileDraft["openingHours"]) => {
      if (!canManageProfile) return
      changeDraft({ ...editor.draft, openingHours }, "Opening-hour changes staged.")
    },
    [canManageProfile, changeDraft, editor.draft],
  )

  return {
    actions: {
      addSpecialty,
      cancelChanges,
      changeDescription,
      changeName,
      openDialog,
      openTeamMemberDialog,
      openTreatmentDialog,
      removeSpecialty,
      removeTeamMember,
      removeTreatment,
      saveAddress,
      saveChanges,
      saveOpeningHours,
      saveTeamMember,
      saveTreatment,
      selectGalleryCover,
      setDialogOpen,
      undoRemoval,
    },
    dialog,
    model: {
      ...projection,
      availableMasterTreatments,
      selectedTeamMember,
      selectedTreatment,
      treatmentViews,
    },
  } as const
}
