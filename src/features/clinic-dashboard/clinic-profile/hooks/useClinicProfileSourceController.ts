"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  areClinicProfileDraftInputsEqual,
  classifyClinicProfilePublishReconciliation,
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

type UnresolvedPublish = Readonly<{
  attemptedDraft: ClinicProfileDraftInput
  expectedDraftRevision: number
  expectedPublishedRevision: number
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
  const [unresolvedPublish, setUnresolvedPublish] = useState<UnresolvedPublish>()

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

  const enterConflict = useCallback((message?: string) => {
    setDialog(null)
    setConfirmation(null)
    setUnresolvedPublish(undefined)
    setMode("conflict")
    setStatusMessage(
      message ?? "The published profile or draft changed elsewhere. Your local values are preserved below.",
    )
  }, [])

  const startEditing = useCallback(() => {
    if (!snapshot) return
    const nextDraft = createClinicProfileDraftInput(snapshot.draft ?? snapshot.published)
    setWorkingDraft(nextDraft)
    setSavedBaseline(nextDraft)
    setValidationErrors({})
    setUnresolvedPublish(undefined)
    setStatusMessage(snapshot.draft ? "Continue the saved draft." : "")
    setMode("edit")
  }, [snapshot])

  const updateDraft = useCallback((update: (current: ClinicProfileDraftInput) => ClinicProfileDraftInput) => {
    setWorkingDraft((current) => (current ? update(current) : current))
    setStatusMessage("")
    setValidationErrors({})
    setUnresolvedPublish(undefined)
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
    async (localDraft: ClinicProfileDraftInput, leaveAfterSave: boolean) => {
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
          setConfirmation(null)
          setMode(leaveAfterSave ? "view" : "edit")
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
          return await reconcileUnknownSave(workingDraft, leaveAfterSave)
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
    setUnresolvedPublish(undefined)
    setStatusMessage("")
  }, [hasSavedChanges, isDirty, snapshot?.draft, workingDraft])

  const finishPublished = useCallback((nextSnapshot: ClinicProfileSnapshot) => {
    setSnapshot(nextSnapshot)
    setWorkingDraft(undefined)
    setSavedBaseline(undefined)
    setUnresolvedPublish(undefined)
    setMode("view")
    setValidationErrors({})
    setStatusMessage("")
    toast.success("Clinic profile published.")
  }, [])

  const applyPublishReconciliation = useCallback(
    (latest: ClinicProfileSnapshot, attempt: UnresolvedPublish) => {
      setSnapshot(latest)
      const result = classifyClinicProfilePublishReconciliation(
        latest,
        attempt.attemptedDraft,
        attempt.expectedDraftRevision,
        attempt.expectedPublishedRevision,
      )
      if (result === "published") {
        finishPublished(latest)
        return
      }
      if (result === "not-published" && latest.draft) {
        const saved = createClinicProfileDraftInput(latest.draft)
        setWorkingDraft(saved)
        setSavedBaseline(saved)
        setUnresolvedPublish(undefined)
        setStatusMessage("Publishing was not completed. Review the draft and try again.")
        return
      }
      enterConflict()
    },
    [enterConflict, finishPublished],
  )

  const publishDraft = useCallback(async () => {
    if (!snapshot?.draft || operation !== "idle" || unresolvedPublish) return
    setOperation("publishing")
    setStatusMessage("")
    const attempt = {
      attemptedDraft: createClinicProfileDraftInput(snapshot.draft),
      expectedDraftRevision: snapshot.draft.revision,
      expectedPublishedRevision: snapshot.published.revision,
    } satisfies UnresolvedPublish
    try {
      const nextSnapshot = await commands.publishDraft({
        expectedDraftRevision: attempt.expectedDraftRevision,
        expectedPublishedRevision: attempt.expectedPublishedRevision,
      })
      finishPublished(nextSnapshot)
    } catch (error) {
      const outcome = errorOutcome(error)
      if (outcome === "conflict") {
        enterConflict()
      } else if (outcome === "unknown") {
        try {
          const latest = await commands.loadSnapshot()
          applyPublishReconciliation(latest, attempt)
        } catch {
          setUnresolvedPublish(attempt)
          setStatusMessage("Publishing could not be confirmed. Reload the current status before continuing.")
        }
      } else {
        setStatusMessage("The profile could not be published. The draft is preserved.")
      }
    } finally {
      setOperation("idle")
    }
  }, [
    applyPublishReconciliation,
    commands,
    enterConflict,
    finishPublished,
    operation,
    snapshot,
    unresolvedPublish,
  ])

  const resolvePublishOutcome = useCallback(async () => {
    if (!unresolvedPublish || operation !== "idle") return
    setOperation("loading")
    setStatusMessage("")
    try {
      const latest = await commands.loadSnapshot()
      applyPublishReconciliation(latest, unresolvedPublish)
    } catch {
      setStatusMessage("Publishing still cannot be confirmed. Reload the current status to try again.")
    } finally {
      setOperation("idle")
    }
  }, [applyPublishReconciliation, commands, operation, unresolvedPublish])

  const discardDraft = useCallback(async () => {
    if (!snapshot?.draft || operation !== "idle") return
    const expectedDraft = createClinicProfileDraftInput(snapshot.draft)
    const expectedDraftRevision = snapshot.draft.revision
    const expectedPublishedRevision = snapshot.published.revision
    setOperation("discarding")
    try {
      const nextSnapshot = await commands.discardDraft({
        expectedDraftRevision,
      })
      setSnapshot(nextSnapshot)
      setWorkingDraft(undefined)
      setSavedBaseline(undefined)
      setConfirmation(null)
      setMode("view")
      setStatusMessage("Draft discarded.")
    } catch (error) {
      const outcome = errorOutcome(error)
      if (outcome === "conflict") {
        enterConflict()
      } else if (outcome === "unknown") {
        try {
          const latest = await commands.loadSnapshot()
          setSnapshot(latest)
          if (!latest.draft) {
            setWorkingDraft(undefined)
            setSavedBaseline(undefined)
            setConfirmation(null)
            setMode("view")
            setStatusMessage("Draft discarded.")
          } else if (
            latest.draft.revision === expectedDraftRevision &&
            latest.published.revision === expectedPublishedRevision &&
            areClinicProfileDraftInputsEqual(createClinicProfileDraftInput(latest.draft), expectedDraft)
          ) {
            setConfirmation(null)
            setStatusMessage("The draft was not discarded. It is still available.")
          } else {
            enterConflict()
          }
        } catch {
          enterConflict(
            "Discarding could not be confirmed. Your local values remain visible; reload latest before continuing.",
          )
        }
      } else {
        setConfirmation(null)
        setStatusMessage("The draft was not discarded. It is still available.")
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
      setUnresolvedPublish(undefined)
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
      resolvePublishOutcome,
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
      publishOutcomeUnresolved: Boolean(unresolvedPublish),
      published: snapshot?.published,
      snapshot,
      statusMessage,
      validationErrors,
      workingDraft,
    },
  } as const
}
