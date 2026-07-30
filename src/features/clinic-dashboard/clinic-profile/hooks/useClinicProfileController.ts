"use client"

import { useCallback, useReducer, useState } from "react"
import type { ClinicProfileDraft, ClinicTeamMember, ClinicTeamMemberInput } from "../model/clinic-profile"
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

type UseClinicProfileControllerOptions = Readonly<{
  commands: ClinicProfileCommands
  dialogAvailability: ClinicProfileDialogAvailability
  initialDialog?: Extract<ClinicProfileDialogId, "team-member">
  initialProfile: ClinicProfileDraft
  onProfileSaved?: (profile: ClinicProfileDraft) => void
}>

type ClinicProfileDialogState = Readonly<{
  availability: ClinicProfileDialogAvailability
  requestedDialog?: ClinicProfileDialogId
  selectedTeamMemberId?: string
}>

export function useClinicProfileController({
  commands,
  dialogAvailability,
  initialDialog,
  initialProfile,
  onProfileSaved,
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
  const canManageProfile = isClinicProfileManagementInteractive(dialogAvailability.profileManagement)
  const canManageTeam = isClinicProfileManagementInteractive(dialogAvailability.teamManagement)
  const projection = selectClinicProfileEditorProjection(editor, dialogAvailability)
  const selectedTeamMember = projection.profile.team.find(
    (member) => member.id === activeDialogState.selectedTeamMemberId,
  )
  const hasSelectedDialogEntity =
    activeDialogState.requestedDialog === "team-member" && Boolean(selectedTeamMember)
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

  const setDialogOpen = useCallback(
    (dialogId: ClinicProfileDialogId, open: boolean) => {
      if (open) {
        const hasSelectedEntity = dialogId === "team-member" && Boolean(selectedTeamMember)
        if (isDialogAvailable(dialogId, hasSelectedEntity)) {
          setDialogState({ availability: dialogAvailability, requestedDialog: dialogId })
        }
        return
      }

      setDialogState((current) =>
        current.requestedDialog === dialogId ? { availability: dialogAvailability } : current,
      )
    },
    [dialogAvailability, isDialogAvailable, selectedTeamMember],
  )

  const openDialog = useCallback(
    (dialogId: Exclude<ClinicProfileDialogId, "team-member">) => {
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

  const undoRemoval = useCallback(() => {
    if (!canManageTeam) return
    dispatch({ type: "removalUndone" })
  }, [canManageTeam])

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
      removeSpecialty,
      removeTeamMember,
      saveAddress,
      saveChanges,
      saveOpeningHours,
      saveTeamMember,
      selectGalleryCover,
      setDialogOpen,
      undoRemoval,
    },
    dialog,
    model: {
      ...projection,
      selectedTeamMember,
    },
  } as const
}
