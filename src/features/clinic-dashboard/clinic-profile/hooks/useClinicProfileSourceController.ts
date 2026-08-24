"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  areClinicProfileDraftInputsEqual,
  classifyClinicProfileDraftCreateReconciliation,
  classifyClinicProfileDraftSaveReconciliation,
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
  onSnapshotChanged?: (snapshot: ClinicProfileSnapshot) => void
}>

type UnresolvedPublish = Readonly<{
  attemptedDraft: ClinicProfileDraftInput
  expectedDraftRevision: number
  expectedPublishedRevision: number
}>

function errorOutcome(error: unknown) {
  return error instanceof ClinicProfileSourceCommandError ? error.outcome : "unknown"
}

const clinicProfileConflictMessage =
  "The published profile or draft changed elsewhere. Your local values are preserved below."

function getPersistedConflictDraft(snapshot: ClinicProfileSnapshot | undefined) {
  const draft = snapshot?.draft
  if (!draft || draft.basePublishedRevision === snapshot.published.revision) return undefined
  return createClinicProfileDraftInput(draft)
}

function clinicProfileSnapshotIdentity(snapshot: ClinicProfileSnapshot | undefined) {
  if (!snapshot) return "unavailable"
  const draftIdentity = snapshot.draft
    ? `${snapshot.draft.basePublishedRevision}:${snapshot.draft.revision}`
    : "none"
  const citiesIdentity = snapshot.availableCities.map((city) => `${city.id}:${city.name}`).join("|")
  return `${snapshot.published.revision}:${draftIdentity}:${citiesIdentity}`
}

export function useClinicProfileSourceController({
  commands,
  initialSnapshot,
  onSnapshotChanged,
}: UseClinicProfileSourceControllerOptions) {
  const initialConflictDraft = getPersistedConflictDraft(initialSnapshot)
  const initialSnapshotIdentity = clinicProfileSnapshotIdentity(initialSnapshot)
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [receivedInitialSnapshotIdentity, setReceivedInitialSnapshotIdentity] =
    useState(initialSnapshotIdentity)
  const [pendingInitialSnapshot, setPendingInitialSnapshot] = useState<
    Readonly<{ snapshot: ClinicProfileSnapshot | undefined }> | undefined
  >()
  const [mode, setMode] = useState<ClinicProfileSourceEditorMode>(initialConflictDraft ? "conflict" : "view")
  const [workingDraft, setWorkingDraft] = useState<ClinicProfileDraftInput | undefined>(initialConflictDraft)
  const [savedBaseline, setSavedBaseline] = useState<ClinicProfileDraftInput | undefined>(
    initialConflictDraft,
  )
  const [dialog, setDialog] = useState<ClinicProfileSourceDialog>(null)
  const [confirmation, setConfirmation] = useState<ClinicProfileSourceConfirmation>(null)
  const [operation, setOperation] = useState<"discarding" | "idle" | "loading" | "publishing" | "saving">(
    "idle",
  )
  const [statusMessage, setStatusMessage] = useState(initialConflictDraft ? clinicProfileConflictMessage : "")
  const [validationErrors, setValidationErrors] = useState<ClinicProfileValidationErrors>({})
  const [unresolvedPublish, setUnresolvedPublish] = useState<UnresolvedPublish>()
  const acceptSnapshot = useCallback((nextSnapshot: ClinicProfileSnapshot | undefined) => {
    setSnapshot(nextSnapshot)
    setPendingInitialSnapshot(undefined)
  }, [])

  const isDirty = Boolean(
    workingDraft && savedBaseline && !areClinicProfileDraftInputsEqual(workingDraft, savedBaseline),
  )
  const hasSavedChanges = Boolean(
    snapshot?.draft &&
    clinicProfileDraftHasPublishedChanges(createClinicProfileDraftInput(snapshot.draft), snapshot.published),
  )
  const changeSet = useMemo(() => (snapshot ? createClinicProfileChangeSet(snapshot) : undefined), [snapshot])

  const hasNewInitialSnapshot = initialSnapshotIdentity !== receivedInitialSnapshotIdentity
  const authoritativeUpdate = hasNewInitialSnapshot ? { snapshot: initialSnapshot } : pendingInitialSnapshot

  if (hasNewInitialSnapshot) {
    setReceivedInitialSnapshotIdentity(initialSnapshotIdentity)
  }

  if (authoritativeUpdate) {
    const canAdoptSnapshot = operation === "idle" && !isDirty && mode !== "conflict" && !unresolvedPublish
    if (canAdoptSnapshot) {
      const nextSnapshot = authoritativeUpdate.snapshot
      const nextConflictDraft = getPersistedConflictDraft(nextSnapshot)
      acceptSnapshot(nextSnapshot)
      setDialog(null)
      setConfirmation(null)
      setValidationErrors({})
      setUnresolvedPublish(undefined)
      setStatusMessage(nextConflictDraft ? clinicProfileConflictMessage : "")

      if (nextConflictDraft) {
        setWorkingDraft(nextConflictDraft)
        setSavedBaseline(nextConflictDraft)
        setMode("conflict")
      } else if (nextSnapshot && mode === "edit") {
        const nextDraft = createClinicProfileDraftInput(nextSnapshot.draft ?? nextSnapshot.published)
        setWorkingDraft(nextDraft)
        setSavedBaseline(nextDraft)
      } else {
        setWorkingDraft(undefined)
        setSavedBaseline(undefined)
        setMode("view")
      }
    } else if (hasNewInitialSnapshot) {
      setPendingInitialSnapshot(authoritativeUpdate)
    }
  }

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
    setStatusMessage(message ?? clinicProfileConflictMessage)
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

  const finishDraftSaved = useCallback(
    (
      nextSnapshot: ClinicProfileSnapshot,
      attemptedDraft: ClinicProfileDraftInput,
      leaveAfterSave: boolean,
    ) => {
      if (
        !nextSnapshot.draft ||
        !areClinicProfileDraftInputsEqual(createClinicProfileDraftInput(nextSnapshot.draft), attemptedDraft)
      ) {
        acceptSnapshot(nextSnapshot)
        enterConflict(
          "The saved draft response did not match your local values. Your local values are preserved.",
        )
        return false
      }

      const saved = createClinicProfileDraftInput(nextSnapshot.draft)
      acceptSnapshot(nextSnapshot)
      setWorkingDraft(saved)
      setSavedBaseline(saved)
      setConfirmation(null)
      setMode(leaveAfterSave ? "view" : "edit")
      setStatusMessage("Draft saved.")
      onSnapshotChanged?.(nextSnapshot)
      return true
    },
    [acceptSnapshot, enterConflict, onSnapshotChanged],
  )

  const reconcileUnknownSave = useCallback(
    async (
      localDraft: ClinicProfileDraftInput,
      baselineDraft: ClinicProfileDraftInput,
      expectedDraftRevision: number,
      expectedPublishedRevision: number,
      leaveAfterSave: boolean,
    ) => {
      try {
        const latest = await commands.loadSnapshot()
        const result = classifyClinicProfileDraftSaveReconciliation(
          latest,
          localDraft,
          baselineDraft,
          expectedDraftRevision,
          expectedPublishedRevision,
        )
        if (result === "saved") return finishDraftSaved(latest, localDraft, leaveAfterSave)
        if (result === "not-saved" && latest.draft) {
          acceptSnapshot(latest)
          setSavedBaseline(createClinicProfileDraftInput(latest.draft))
          setStatusMessage("The save was not completed. Your local changes are still here. Try again.")
          return false
        }
        acceptSnapshot(latest)
        enterConflict()
      } catch {
        enterConflict(
          "Saving could not be confirmed because the latest profile is unavailable. Your local values are preserved below.",
        )
      }
      return false
    },
    [acceptSnapshot, commands, enterConflict, finishDraftSaved],
  )

  const reconcileUnknownCreate = useCallback(
    async (publishedBaseline: ClinicProfileDraftInput, expectedPublishedRevision: number) => {
      try {
        const latest = await commands.loadSnapshot()
        const result = classifyClinicProfileDraftCreateReconciliation(
          latest,
          publishedBaseline,
          expectedPublishedRevision,
        )
        if (result === "created" && latest.draft) {
          acceptSnapshot(latest)
          setSavedBaseline(createClinicProfileDraftInput(latest.draft))
          return latest
        }
        if (result === "not-created") {
          acceptSnapshot(latest)
          setSavedBaseline(publishedBaseline)
          setStatusMessage("The draft was not created. Your local changes are still here. Try again.")
          return undefined
        }
        acceptSnapshot(latest)
        enterConflict()
      } catch {
        enterConflict(
          "Draft creation could not be confirmed because the latest profile is unavailable. Your local values are preserved below.",
        )
      }
      return undefined
    },
    [acceptSnapshot, commands, enterConflict],
  )

  const reconcileMissingDraft = useCallback(
    async (expectedPublishedRevision: number) => {
      try {
        const latest = await commands.loadSnapshot()
        acceptSnapshot(latest)
        if (!latest.draft && latest.published.revision === expectedPublishedRevision) {
          setSavedBaseline(createClinicProfileDraftInput(latest.published))
          setStatusMessage(
            "The saved draft no longer exists. Your local changes are still here. Save again to create a new draft.",
          )
          return
        }
        enterConflict()
      } catch {
        enterConflict(
          "The missing draft could not be reconciled because the latest profile is unavailable. Your local values are preserved below.",
        )
      }
    },
    [acceptSnapshot, commands, enterConflict],
  )

  const saveDraft = useCallback(
    async (leaveAfterSave = false) => {
      if (!snapshot || !workingDraft || operation !== "idle") return false
      setOperation("saving")
      setStatusMessage("")
      try {
        let saveSnapshot = snapshot
        let baselineDraft =
          savedBaseline ?? createClinicProfileDraftInput(snapshot.draft ?? snapshot.published)
        let createdDuringSave = false

        if (!saveSnapshot.draft) {
          const publishedBaseline = createClinicProfileDraftInput(saveSnapshot.published)
          try {
            const createdSnapshot = await commands.createDraft({
              expectedPublishedRevision: saveSnapshot.published.revision,
            })
            const creationResult = classifyClinicProfileDraftCreateReconciliation(
              createdSnapshot,
              publishedBaseline,
              saveSnapshot.published.revision,
            )
            if (creationResult !== "created" || !createdSnapshot.draft) {
              acceptSnapshot(createdSnapshot)
              enterConflict(
                "The created draft response did not match the published profile. Your local values are preserved.",
              )
              return false
            }
            saveSnapshot = createdSnapshot
            baselineDraft = createClinicProfileDraftInput(createdSnapshot.draft)
            acceptSnapshot(createdSnapshot)
            setSavedBaseline(baselineDraft)
            createdDuringSave = true
          } catch (error) {
            const outcome = errorOutcome(error)
            if (outcome === "conflict") {
              enterConflict()
              return false
            }
            if (outcome === "unknown") {
              const reconciledSnapshot = await reconcileUnknownCreate(
                publishedBaseline,
                saveSnapshot.published.revision,
              )
              if (!reconciledSnapshot?.draft) return false
              saveSnapshot = reconciledSnapshot
              baselineDraft = createClinicProfileDraftInput(reconciledSnapshot.draft)
              createdDuringSave = true
            } else {
              setStatusMessage("The draft could not be created. Your local changes are still here.")
              return false
            }
          }
        }

        if (!saveSnapshot.draft) {
          enterConflict("The active draft could not be resolved. Your local values are preserved.")
          return false
        }
        const expectedDraftRevision = saveSnapshot.draft.revision
        const expectedPublishedRevision = saveSnapshot.published.revision
        try {
          const nextSnapshot = await commands.saveDraft({
            draft: workingDraft,
            expectedDraftRevision,
            expectedPublishedRevision,
          })
          return finishDraftSaved(nextSnapshot, workingDraft, leaveAfterSave)
        } catch (error) {
          const outcome = errorOutcome(error)
          if (outcome === "conflict") {
            enterConflict()
          } else if (outcome === "not-found") {
            await reconcileMissingDraft(expectedPublishedRevision)
          } else if (outcome === "unknown") {
            return await reconcileUnknownSave(
              workingDraft,
              baselineDraft,
              expectedDraftRevision,
              expectedPublishedRevision,
              leaveAfterSave,
            )
          } else {
            setStatusMessage(
              createdDuringSave
                ? "The draft was created, but your changes could not be saved. Your local changes are still here."
                : "The draft could not be saved. Your local changes are still here.",
            )
          }
          return false
        }
      } finally {
        setOperation("idle")
      }
    },
    [
      acceptSnapshot,
      commands,
      enterConflict,
      finishDraftSaved,
      operation,
      reconcileUnknownCreate,
      reconcileMissingDraft,
      reconcileUnknownSave,
      savedBaseline,
      snapshot,
      workingDraft,
    ],
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
    if (!snapshot?.draft || isDirty || !hasSavedChanges) return
    const reviewDraft = createClinicProfileDraftInput(snapshot.draft)
    const errors = validateClinicProfileForPublish(reviewDraft)
    setWorkingDraft(reviewDraft)
    setSavedBaseline(reviewDraft)
    setValidationErrors(errors)
    if (Object.keys(errors).length > 0) {
      setMode("edit")
      setStatusMessage("Resolve the highlighted fields before publishing.")
      return
    }
    setMode("review")
    setUnresolvedPublish(undefined)
    setStatusMessage("")
  }, [hasSavedChanges, isDirty, snapshot])

  const finishPublished = useCallback(
    (nextSnapshot: ClinicProfileSnapshot) => {
      acceptSnapshot(nextSnapshot)
      setWorkingDraft(undefined)
      setSavedBaseline(undefined)
      setUnresolvedPublish(undefined)
      setMode("view")
      setValidationErrors({})
      setStatusMessage("")
      onSnapshotChanged?.(nextSnapshot)
      toast.success("Clinic profile published.")
    },
    [acceptSnapshot, onSnapshotChanged],
  )

  const applyPublishReconciliation = useCallback(
    (latest: ClinicProfileSnapshot, attempt: UnresolvedPublish) => {
      acceptSnapshot(latest)
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
    [acceptSnapshot, enterConflict, finishPublished],
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
      } else if (outcome === "unknown" || outcome === "not-found") {
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

  const finishDraftDiscarded = useCallback(
    (nextSnapshot: ClinicProfileSnapshot) => {
      acceptSnapshot(nextSnapshot)
      setWorkingDraft(undefined)
      setSavedBaseline(undefined)
      setConfirmation(null)
      setMode("view")
      setStatusMessage("Draft discarded.")
      onSnapshotChanged?.(nextSnapshot)
    },
    [acceptSnapshot, onSnapshotChanged],
  )

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
      finishDraftDiscarded(nextSnapshot)
    } catch (error) {
      const outcome = errorOutcome(error)
      if (outcome === "conflict") {
        enterConflict()
      } else if (outcome === "unknown" || outcome === "not-found") {
        try {
          const latest = await commands.loadSnapshot()
          acceptSnapshot(latest)
          if (!latest.draft && latest.published.revision === expectedPublishedRevision) {
            finishDraftDiscarded(latest)
          } else if (
            latest.draft?.revision === expectedDraftRevision &&
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
  }, [acceptSnapshot, commands, enterConflict, finishDraftDiscarded, operation, snapshot])

  const reloadLatest = useCallback(async () => {
    if (operation !== "idle") return
    setOperation("loading")
    try {
      const latest = await commands.loadSnapshot()
      acceptSnapshot(latest)
      setConfirmation(null)
      setValidationErrors({})
      setUnresolvedPublish(undefined)
      const latestConflictDraft = getPersistedConflictDraft(latest)
      if (latestConflictDraft) {
        setWorkingDraft(latestConflictDraft)
        setSavedBaseline(latestConflictDraft)
        setMode("conflict")
        setStatusMessage(clinicProfileConflictMessage)
      } else {
        setWorkingDraft(undefined)
        setSavedBaseline(undefined)
        setMode("view")
        setStatusMessage("Latest profile loaded.")
      }
    } catch {
      setConfirmation(null)
      setStatusMessage("The latest profile could not be loaded. Your local values are still here.")
    } finally {
      setOperation("idle")
    }
  }, [acceptSnapshot, commands, operation])

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
