"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  areClinicProfileDraftInputsEqual,
  clinicProfileDraftHasPublishedChanges,
  createClinicProfileChangeSet,
  validateClinicProfileForPublish,
  type ClinicProfileValidationErrors,
} from "../model/clinic-profile-editing"
import {
  createClinicProfileDraftInput,
  type ClinicProfileDraftInput,
  type ClinicProfileOpeningHours,
  type ClinicProfileSnapshot,
  type ClinicProfileSourceAddress,
} from "../model/clinic-profile-source"
import {
  ClinicProfileSourceCommandError,
  type ClinicProfileSourceCommands,
} from "../model/clinic-profile-source-commands"

export type ClinicProfileSourceEditorMode = "conflict" | "edit" | "review" | "view"
export type ClinicProfileSourceDialog = "address" | "hours" | null
export type ClinicProfileSourceConfirmation = "discard" | "leave" | "reload" | null

type UseClinicProfileSourceControllerOptions = Readonly<{
  commands: ClinicProfileSourceCommands
  initialSnapshot?: ClinicProfileSnapshot
}>

function errorOutcome(error: unknown) {
  return error instanceof ClinicProfileSourceCommandError ? error.outcome : "unknown"
}

export function useClinicProfileSourceController({
  commands,
  initialSnapshot,
}: UseClinicProfileSourceControllerOptions) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [mode, setMode] = useState<ClinicProfileSourceEditorMode>("view")
  const [workingDraft, setWorkingDraft] = useState<ClinicProfileDraftInput>()
  const [savedBaseline, setSavedBaseline] = useState<ClinicProfileDraftInput>()
  const [dialog, setDialog] = useState<ClinicProfileSourceDialog>(null)
  const [confirmation, setConfirmation] = useState<ClinicProfileSourceConfirmation>(null)
  const [operation, setOperation] = useState<"discarding" | "idle" | "loading" | "publishing" | "saving">(
    "idle",
  )
  const [statusMessage, setStatusMessage] = useState("")
  const [validationErrors, setValidationErrors] = useState<ClinicProfileValidationErrors>({})

  const isDirty = Boolean(
    workingDraft && savedBaseline && !areClinicProfileDraftInputsEqual(workingDraft, savedBaseline),
  )
  const hasSavedChanges = Boolean(
    snapshot?.draft &&
    clinicProfileDraftHasPublishedChanges(createClinicProfileDraftInput(snapshot.draft), snapshot.published),
  )
  const changeSet = useMemo(() => (snapshot ? createClinicProfileChangeSet(snapshot) : undefined), [snapshot])

  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  const enterConflict = useCallback(() => {
    setDialog(null)
    setConfirmation(null)
    setMode("conflict")
    setStatusMessage(
      "The published profile or draft changed elsewhere. Your local values are preserved below.",
    )
  }, [])

  const startEditing = useCallback(() => {
    if (!snapshot) return
    const nextDraft = createClinicProfileDraftInput(snapshot.draft ?? snapshot.published)
    setWorkingDraft(nextDraft)
    setSavedBaseline(nextDraft)
    setValidationErrors({})
    setStatusMessage(snapshot.draft ? "Continue the saved draft." : "")
    setMode("edit")
  }, [snapshot])

  const updateDraft = useCallback((update: (current: ClinicProfileDraftInput) => ClinicProfileDraftInput) => {
    setWorkingDraft((current) => (current ? update(current) : current))
    setStatusMessage("")
    setValidationErrors({})
  }, [])

  const changeName = useCallback(
    (name: string) => updateDraft((current) => ({ ...current, name })),
    [updateDraft],
  )
  const changeDescription = useCallback(
    (descriptionText: string) => updateDraft((current) => ({ ...current, descriptionText })),
    [updateDraft],
  )
  const changeLanguages = useCallback(
    (supportedLanguages: ClinicProfileDraftInput["supportedLanguages"]) =>
      updateDraft((current) => ({ ...current, supportedLanguages })),
    [updateDraft],
  )
  const saveAddress = useCallback(
    (address: ClinicProfileDraftInput["address"]) => updateDraft((current) => ({ ...current, address })),
    [updateDraft],
  )
  const saveOpeningHours = useCallback(
    (openingHours: ClinicProfileOpeningHours | undefined) =>
      updateDraft((current) => ({ ...current, openingHours })),
    [updateDraft],
  )

  const reconcileUnknownSave = useCallback(
    async (localDraft: ClinicProfileDraftInput) => {
      try {
        const latest = await commands.loadSnapshot()
        setSnapshot(latest)
        if (
          latest.draft &&
          areClinicProfileDraftInputsEqual(createClinicProfileDraftInput(latest.draft), localDraft)
        ) {
          const saved = createClinicProfileDraftInput(latest.draft)
          setWorkingDraft(saved)
          setSavedBaseline(saved)
          setStatusMessage("Draft saved.")
          return true
        }
      } catch {
        // The unknown outcome remains unresolved; local values stay in memory.
      }
      enterConflict()
      return false
    },
    [commands, enterConflict],
  )

  const saveDraft = useCallback(
    async (leaveAfterSave = false) => {
      if (!snapshot || !workingDraft || operation !== "idle") return false
      setOperation("saving")
      setStatusMessage("")
      try {
        const nextSnapshot = await commands.saveDraft({
          draft: workingDraft,
          expectedDraftRevision: snapshot.draft?.revision ?? null,
          expectedPublishedRevision: snapshot.published.revision,
        })
        const saved = createClinicProfileDraftInput(nextSnapshot.draft ?? nextSnapshot.published)
        setSnapshot(nextSnapshot)
        setWorkingDraft(saved)
        setSavedBaseline(saved)
        setConfirmation(null)
        setMode(leaveAfterSave ? "view" : "edit")
        setStatusMessage("Draft saved.")
        return true
      } catch (error) {
        const outcome = errorOutcome(error)
        if (outcome === "conflict") {
          enterConflict()
        } else if (outcome === "unknown") {
          await reconcileUnknownSave(workingDraft)
        } else {
          setStatusMessage("The draft could not be saved. Your local changes are still here.")
        }
        return false
      } finally {
        setOperation("idle")
      }
    },
    [commands, enterConflict, operation, reconcileUnknownSave, snapshot, workingDraft],
  )

  const requestCancel = useCallback(() => {
    if (!isDirty) {
      setMode("view")
      setStatusMessage("")
      return
    }
    setConfirmation("leave")
  }, [isDirty])

  const leaveWithoutSaving = useCallback(() => {
    setConfirmation(null)
    setMode("view")
    setWorkingDraft(undefined)
    setSavedBaseline(undefined)
    setStatusMessage("")
    setValidationErrors({})
  }, [])

  const requestReview = useCallback(() => {
    if (!snapshot?.draft || !workingDraft || isDirty || !hasSavedChanges) return
    const errors = validateClinicProfileForPublish(workingDraft)
    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) {
      setStatusMessage("Resolve the highlighted fields before publishing.")
      return
    }
    setMode("review")
    setStatusMessage("")
  }, [hasSavedChanges, isDirty, snapshot?.draft, workingDraft])

  const publishDraft = useCallback(async () => {
    if (!snapshot?.draft || operation !== "idle") return
    setOperation("publishing")
    setStatusMessage("")
    const expectedDraftRevision = snapshot.draft.revision
    const expectedPublishedRevision = snapshot.published.revision
    try {
      const nextSnapshot = await commands.publishDraft({
        expectedDraftRevision,
        expectedPublishedRevision,
      })
      setSnapshot(nextSnapshot)
      setWorkingDraft(undefined)
      setSavedBaseline(undefined)
      setMode("view")
      setValidationErrors({})
      toast.success("Clinic profile published.")
    } catch (error) {
      const outcome = errorOutcome(error)
      if (outcome === "conflict") {
        enterConflict()
      } else if (outcome === "unknown") {
        try {
          const latest = await commands.loadSnapshot()
          setSnapshot(latest)
          if (!latest.draft && latest.published.revision !== expectedPublishedRevision) {
            setWorkingDraft(undefined)
            setSavedBaseline(undefined)
            setMode("view")
            toast.success("Clinic profile published.")
          } else if (
            latest.draft?.revision === expectedDraftRevision &&
            latest.published.revision === expectedPublishedRevision
          ) {
            setStatusMessage("Publishing could not be confirmed. Review the draft and try again.")
          } else {
            enterConflict()
          }
        } catch {
          setStatusMessage(
            "Publishing could not be confirmed. Your draft is preserved; reload before trying again.",
          )
        }
      } else {
        setStatusMessage("The profile could not be published. The draft is preserved.")
      }
    } finally {
      setOperation("idle")
    }
  }, [commands, enterConflict, operation, snapshot])

  const discardDraft = useCallback(async () => {
    if (!snapshot?.draft || operation !== "idle") return
    setOperation("discarding")
    try {
      const nextSnapshot = await commands.discardDraft({
        expectedDraftRevision: snapshot.draft.revision,
      })
      setSnapshot(nextSnapshot)
      setWorkingDraft(undefined)
      setSavedBaseline(undefined)
      setConfirmation(null)
      setMode("view")
      setStatusMessage("Draft discarded.")
    } catch (error) {
      if (errorOutcome(error) === "conflict") {
        enterConflict()
      } else {
        setConfirmation(null)
        setStatusMessage("The draft could not be discarded. It is still preserved.")
      }
    } finally {
      setOperation("idle")
    }
  }, [commands, enterConflict, operation, snapshot])

  const reloadLatest = useCallback(async () => {
    if (operation !== "idle") return
    setOperation("loading")
    try {
      const latest = await commands.loadSnapshot()
      setSnapshot(latest)
      setWorkingDraft(undefined)
      setSavedBaseline(undefined)
      setConfirmation(null)
      setMode("view")
      setValidationErrors({})
      setStatusMessage("Latest profile loaded.")
    } catch {
      setConfirmation(null)
      setStatusMessage("The latest profile could not be loaded. Your local values are still here.")
    } finally {
      setOperation("idle")
    }
  }, [commands, operation])

  return {
    actions: {
      changeDescription,
      changeLanguages,
      changeName,
      discardDraft,
      leaveWithoutSaving,
      publishDraft,
      reloadLatest,
      requestCancel,
      requestReview,
      saveAddress,
      saveDraft,
      saveOpeningHours,
      setConfirmation,
      setDialog,
      setMode,
      startEditing,
    },
    model: {
      changeSet,
      confirmation,
      dialog,
      hasSavedChanges,
      isDirty,
      isUnavailable: !snapshot,
      mode,
      operation,
      published: snapshot?.published,
      snapshot,
      statusMessage,
      validationErrors,
      workingDraft,
    },
  } as const
}
