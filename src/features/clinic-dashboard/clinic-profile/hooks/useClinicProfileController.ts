"use client"

import { useCallback, useReducer, useState } from "react"
import type {
  ClinicProfileDraft,
  ClinicTeamMember,
  ClinicTeamMemberInput,
  ClinicTreatment,
  ClinicTreatmentInput,
} from "../model/clinic-profile"
import type { ClinicProfileCommands } from "../model/clinic-profile-commands"
import {
  isClinicProfileDialogAvailable,
  isClinicProfileDialogAvailabilityEqual,
  selectAvailableClinicProfileDialog,
  type ClinicProfileDialogAvailability,
  type ClinicProfileDialogId,
} from "../model/clinic-profile-dialogs"
import {
  clinicProfileEditorReducer,
  createClinicProfileEditorState,
  selectClinicProfileDirty,
} from "../model/clinic-profile.reducer"

type UseClinicProfileControllerOptions = Readonly<{
  commands: ClinicProfileCommands
  dialogAvailability: ClinicProfileDialogAvailability
  initialDialog?: Extract<ClinicProfileDialogId, "team-member" | "treatment">
  initialProfile: ClinicProfileDraft
}>

type ClinicProfileDialogState = Readonly<{
  availability: ClinicProfileDialogAvailability
  requestedDialog?: ClinicProfileDialogId
  selectedTeamMemberId?: string
  selectedTreatmentId?: string
}>

export function useClinicProfileController({
  commands,
  dialogAvailability,
  initialDialog,
  initialProfile,
}: UseClinicProfileControllerOptions) {
  const [editor, dispatch] = useReducer(
    clinicProfileEditorReducer,
    initialProfile,
    createClinicProfileEditorState,
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
  const isDirty = selectClinicProfileDirty(editor)
  const selectedTeamMember = editor.draft.team.find(
    (member) => member.id === activeDialogState.selectedTeamMemberId,
  )
  const selectedTreatment = editor.draft.treatments.find(
    (treatment) => treatment.id === activeDialogState.selectedTreatmentId,
  )
  const dialog = selectAvailableClinicProfileDialog(activeDialogState.requestedDialog, dialogAvailability)

  const changeDraft = useCallback((profile: ClinicProfileDraft, message?: string) => {
    dispatch({ message, profile, type: "draftChanged" })
  }, [])

  const cancelChanges = useCallback(() => {
    dispatch({ type: "changesCancelled" })
  }, [])

  const changeDescription = useCallback((description: string) => {
    dispatch({ description, type: "descriptionChanged" })
  }, [])

  const changeName = useCallback((name: string) => {
    dispatch({ name, type: "nameChanged" })
  }, [])

  const removeSpecialty = useCallback((specialty: string) => {
    dispatch({ specialty, type: "specialtyRemoved" })
  }, [])

  const saveChanges = useCallback(async () => {
    if (!selectClinicProfileDirty(editor)) return

    dispatch({ type: "saveStarted" })
    try {
      const profile = await commands.saveClinicProfile(editor.draft)
      dispatch({ profile, type: "saveSucceeded" })
    } catch {
      dispatch({ type: "saveFailed" })
    }
  }, [commands, editor])

  const saveTeamMember = useCallback(
    (input: ClinicTeamMemberInput) => {
      const editingId = activeDialogState.selectedTeamMemberId
      const member = {
        ...input,
        id: editingId ?? commands.createClinicProfileEntityId("team"),
      }
      dispatch({ editingId, member, type: "teamMemberSaved" })
      setDialogState((current) => ({ ...current, selectedTeamMemberId: undefined }))
    },
    [activeDialogState.selectedTeamMemberId, commands],
  )

  const saveTreatment = useCallback(
    (input: ClinicTreatmentInput) => {
      const editingId = activeDialogState.selectedTreatmentId
      const treatment = {
        ...input,
        id: editingId ?? commands.createClinicProfileEntityId("treatment"),
      }
      dispatch({
        editingId,
        treatment,
        type: "treatmentSaved",
      })
      setDialogState((current) => ({ ...current, selectedTreatmentId: undefined }))
    },
    [activeDialogState.selectedTreatmentId, commands],
  )

  const isDialogAvailable = useCallback(
    (dialogId: ClinicProfileDialogId) =>
      isClinicProfileDialogAvailable(dialogId, {
        canManageProfile: dialogAvailability.canManageProfile,
        showProfileManagement: dialogAvailability.showProfileManagement,
        showTeamManagement: dialogAvailability.showTeamManagement,
      }),
    [
      dialogAvailability.canManageProfile,
      dialogAvailability.showProfileManagement,
      dialogAvailability.showTeamManagement,
    ],
  )

  const openTeamMemberDialog = useCallback(
    (member?: ClinicTeamMember) => {
      if (!isDialogAvailable("team-member")) return
      setDialogState({
        availability: dialogAvailability,
        requestedDialog: "team-member",
        selectedTeamMemberId: member?.id,
      })
    },
    [dialogAvailability, isDialogAvailable],
  )

  const openTreatmentDialog = useCallback(
    (treatment?: ClinicTreatment) => {
      if (!isDialogAvailable("treatment")) return
      setDialogState({
        availability: dialogAvailability,
        requestedDialog: "treatment",
        selectedTreatmentId: treatment?.id,
      })
    },
    [dialogAvailability, isDialogAvailable],
  )

  const setDialogOpen = useCallback(
    (dialogId: ClinicProfileDialogId, open: boolean) => {
      if (open) {
        if (isDialogAvailable(dialogId)) {
          setDialogState({ availability: dialogAvailability, requestedDialog: dialogId })
        }
        return
      }

      setDialogState((current) =>
        current.requestedDialog === dialogId ? { availability: dialogAvailability } : current,
      )
    },
    [dialogAvailability, isDialogAvailable],
  )

  const openDialog = useCallback(
    (dialogId: Exclude<ClinicProfileDialogId, "team-member" | "treatment">) => {
      if (isDialogAvailable(dialogId)) {
        setDialogState({ availability: dialogAvailability, requestedDialog: dialogId })
      }
    },
    [dialogAvailability, isDialogAvailable],
  )

  const moveTreatment = useCallback((id: string, direction: -1 | 1) => {
    dispatch({ direction, id, type: "treatmentMoved" })
  }, [])

  const removeTeamMember = useCallback((id: string) => {
    dispatch({ id, type: "teamMemberRemoved" })
  }, [])

  const removeTreatment = useCallback((id: string) => {
    dispatch({ id, type: "treatmentRemoved" })
  }, [])

  const undoRemoval = useCallback(() => {
    dispatch({ type: "removalUndone" })
  }, [])

  const addSpecialty = useCallback((specialty: string) => {
    dispatch({ specialty, type: "specialtyAdded" })
  }, [])

  const selectGalleryCover = useCallback(
    (id: string) => {
      changeDraft(
        {
          ...editor.draft,
          gallery: editor.draft.gallery.map((item) => ({ ...item, isCover: item.id === id })),
        },
        "Gallery cover staged.",
      )
    },
    [changeDraft, editor.draft],
  )

  const saveAddress = useCallback(
    (address: ClinicProfileDraft["address"]) => {
      changeDraft({ ...editor.draft, address }, "Address changes staged.")
    },
    [changeDraft, editor.draft],
  )

  const saveOpeningHours = useCallback(
    (openingHours: ClinicProfileDraft["openingHours"]) => {
      changeDraft({ ...editor.draft, openingHours }, "Opening-hour changes staged.")
    },
    [changeDraft, editor.draft],
  )

  return {
    actions: {
      addSpecialty,
      cancelChanges,
      changeDescription,
      changeName,
      moveTreatment,
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
      isDirty,
      profile: editor.draft,
      saveState: editor.saveState,
      selectedTeamMember,
      selectedTreatment,
      statusMessage: editor.statusMessage,
      undoKind: editor.undo?.kind,
      undoMessage: editor.undo ? `${editor.undo.item.name} removed. Undo restores this item.` : undefined,
    },
  } as const
}
