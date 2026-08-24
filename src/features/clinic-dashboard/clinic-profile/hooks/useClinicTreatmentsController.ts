"use client"

import { useCallback, useState } from "react"
import type { ClinicProfileManagementAccess } from "../model/clinic-profile-management"
import { isClinicProfileManagementInteractive } from "../model/clinic-profile-management"
import type {
  ClinicTreatmentFormInput,
  ClinicTreatmentOffering,
  ClinicTreatmentsSnapshot,
} from "../model/clinic-treatment"
import { ClinicTreatmentCommandError, type ClinicTreatmentCommands } from "../model/clinic-treatment-commands"
import {
  getClinicTreatmentInputError,
  isValidClinicTreatmentPrice,
  selectAvailableMasterTreatments,
} from "../model/clinic-treatments"

type UseClinicTreatmentsControllerOptions = Readonly<{
  commands: ClinicTreatmentCommands
  initialDialog?: "treatment"
  initialSnapshot: ClinicTreatmentsSnapshot
  management: ClinicProfileManagementAccess
}>

export function useClinicTreatmentsController({
  commands,
  initialDialog,
  initialSnapshot,
  management,
}: UseClinicTreatmentsControllerOptions) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>()
  const [dialogOpen, setDialogOpen] = useState(
    initialDialog === "treatment" && isClinicProfileManagementInteractive(management),
  )
  const [isBusy, setIsBusy] = useState(false)
  const [dialogMessage, setDialogMessage] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const selectedOffering =
    snapshot.status === "ready"
      ? snapshot.offerings.find((offering) => offering.id === selectedOfferingId)
      : undefined
  const availableTreatments =
    snapshot.status === "ready" ? selectAvailableMasterTreatments(snapshot.catalogue, snapshot.offerings) : []

  const reload = useCallback(async () => {
    setIsBusy(true)
    try {
      const nextSnapshot = await commands.loadTreatments()
      setSnapshot(nextSnapshot)
      setStatusMessage(
        nextSnapshot.status === "ready" ? "Treatments reloaded." : "Treatments could not be loaded.",
      )
    } catch {
      setSnapshot({ catalogue: [], offerings: [], status: "temporarily-unavailable" })
      setStatusMessage("Treatments could not be loaded. Try again.")
    } finally {
      setIsBusy(false)
    }
  }, [commands])

  const openCreate = useCallback(() => {
    if (!isClinicProfileManagementInteractive(management)) return
    setSelectedOfferingId(undefined)
    setDialogMessage("")
    setStatusMessage("")
    setDialogOpen(true)
  }, [management])

  const openOffering = useCallback(
    (offering: ClinicTreatmentOffering) => {
      if (management === "hidden") return
      setSelectedOfferingId(offering.id)
      setDialogMessage("")
      setStatusMessage("")
      setDialogOpen(true)
    },
    [management],
  )

  const save = useCallback(
    async (input: ClinicTreatmentFormInput) => {
      if (!isClinicProfileManagementInteractive(management) || snapshot.status !== "ready") {
        return false
      }

      const inputError = selectedOffering
        ? isValidClinicTreatmentPrice(input.price)
          ? undefined
          : "Enter a non-negative EUR price with at most two decimal places."
        : getClinicTreatmentInputError(snapshot.catalogue, snapshot.offerings, input)
      if (inputError) {
        setDialogMessage(inputError)
        return false
      }

      setDialogMessage("")
      setIsBusy(true)
      try {
        const offering = selectedOffering
          ? await commands.updateTreatment(selectedOffering.id, {
              active: input.active,
              expectedRevision: selectedOffering.revision,
              price: input.price,
            })
          : await commands.createTreatment({ price: input.price, treatmentId: input.treatmentId })
        setSnapshot({
          ...snapshot,
          offerings: selectedOffering
            ? snapshot.offerings.map((current) => (current.id === offering.id ? offering : current))
            : [...snapshot.offerings, offering],
        })
        setStatusMessage(selectedOffering ? "Treatment updated." : "Treatment added.")
        setDialogOpen(false)
        setSelectedOfferingId(undefined)
        return true
      } catch (error) {
        if (error instanceof ClinicTreatmentCommandError && error.code === "conflict") {
          const refreshed = await commands
            .loadTreatments()
            .catch(() => ({ catalogue: [], offerings: [], status: "temporarily-unavailable" }) as const)
          setSnapshot(refreshed)
          const conflictedOfferingId =
            refreshed.status === "ready"
              ? (selectedOffering?.id ??
                refreshed.offerings.find((offering) => offering.treatment.id === input.treatmentId)?.id)
              : undefined
          if (conflictedOfferingId) setSelectedOfferingId(conflictedOfferingId)
          setStatusMessage(
            refreshed.status === "ready"
              ? "This treatment changed elsewhere. The latest version was loaded."
              : "This treatment was already changed, but the list could not be reloaded.",
          )
          setDialogMessage(
            refreshed.status === "ready"
              ? "Review your values and save again."
              : "Your values were not saved. Close this dialog and reload the treatment list before trying again.",
          )
          return false
        }
        setDialogMessage(
          error instanceof ClinicTreatmentCommandError && error.code === "forbidden"
            ? "You no longer have permission to edit treatments."
            : "Treatment changes could not be saved. Try again.",
        )
        return false
      } finally {
        setIsBusy(false)
      }
    },
    [commands, management, selectedOffering, snapshot],
  )

  return {
    actions: {
      openCreate,
      openOffering,
      reload,
      save,
      setDialogOpen,
    },
    model: {
      availableTreatments,
      dialogMessage,
      dialogOpen,
      isBusy,
      selectedOffering,
      snapshot,
      statusMessage,
    },
  } as const
}
