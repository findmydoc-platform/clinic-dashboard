"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClinicDashboardExactTargetPath } from "@/features/clinic-dashboard/auth/public"
import type {
  NotificationDestinationOpen,
  NotificationOpeningOutcome,
  NotificationOpeningRequest,
} from "@/features/clinic-dashboard/notifications/public"

type Options = Readonly<{
  principalId: string
  clinicId: string
  authorizedClinics?: readonly Readonly<{ id: string }>[]
  requestDeparture: (
    intent: "destination" | "context-change",
    proceed: () => void,
    cancel: () => void,
  ) => void
  navigate: (path: string) => void
}>
type DisplayResult = Readonly<{
  requestId: string
  kind: "inquiry" | "review"
  recordId: string
  status: NotificationOpeningOutcome
}>
type Pending = {
  request: NotificationOpeningRequest
  principalId: string
  generation: number
  accepted: boolean
  finish: (outcome: NotificationOpeningOutcome) => void
}

// Routing intent never supplies access or a receipt. The ordinary domain detail
// reports its committed display before this continuation can resolve successfully.
export function useExactClinicOpening({
  principalId,
  clinicId,
  authorizedClinics,
  requestDeparture,
  navigate,
}: Options) {
  const generation = useRef(0)
  const pending = useRef<Pending | undefined>(undefined)
  const owner = useRef({ principalId, clinicId })
  const [request, setRequest] = useState<NotificationOpeningRequest>()
  const cancel = useCallback(() => {
    generation.current += 1
    pending.current?.finish("cancelled")
    setRequest(undefined)
  }, [])
  useEffect(() => {
    const changed = owner.current.principalId !== principalId || owner.current.clinicId !== clinicId
    owner.current = { principalId, clinicId }
    const current = pending.current
    if (
      current &&
      (current.principalId !== principalId ||
        (changed && (!current.accepted || current.request.clinicId !== clinicId)) ||
        (authorizedClinics && !authorizedClinics.some((clinic) => clinic.id === current.request.clinicId)))
    )
      cancel()
  }, [principalId, clinicId, authorizedClinics, cancel])
  useEffect(
    () => () => {
      generation.current += 1
      pending.current?.finish("cancelled")
    },
    [],
  )
  const open = useCallback<NotificationDestinationOpen>(
    (next, signal) => {
      cancel()
      if (signal.aborted) return Promise.resolve("cancelled")
      const destination = next.destination
      const path = createClinicDashboardExactTargetPath({
        clinicId: next.clinicId,
        kind: destination.kind,
        recordId: destination.kind === "inquiry" ? destination.inquiryId : destination.reviewId,
      })
      if (!path || (authorizedClinics && !authorizedClinics.some((clinic) => clinic.id === next.clinicId)))
        return Promise.resolve("unavailable")
      return new Promise((resolve) => {
        const current: Pending = {
          request: next,
          principalId,
          generation: generation.current,
          accepted: false,
          finish: (outcome) => {
            signal.removeEventListener("abort", aborted)
            if (pending.current === current) {
              pending.current = undefined
              if (outcome === "cancelled") setRequest(undefined)
            }
            resolve(outcome)
          },
        }
        const aborted = () => current.finish("cancelled")
        pending.current = current
        signal.addEventListener("abort", aborted, { once: true })
        requestDeparture(
          next.clinicId === owner.current.clinicId ? "destination" : "context-change",
          () => {
            if (
              pending.current !== current ||
              signal.aborted ||
              current.generation !== generation.current ||
              owner.current.principalId !== principalId
            )
              return
            current.accepted = true
            setRequest(next)
            navigate(path)
          },
          () => current.finish("cancelled"),
        )
      })
    },
    [authorizedClinics, cancel, navigate, principalId, requestDeparture],
  )
  const complete = useCallback((result: DisplayResult) => {
    const current = pending.current
    if (
      !current ||
      !current.accepted ||
      current.generation !== generation.current ||
      current.principalId !== owner.current.principalId ||
      current.request.clinicId !== owner.current.clinicId ||
      current.request.requestId !== result.requestId
    )
      return
    const destination = current.request.destination
    const recordId = destination.kind === "inquiry" ? destination.inquiryId : destination.reviewId
    if (destination.kind !== result.kind || recordId !== result.recordId) return
    current.finish(result.status)
  }, [])
  return { open, complete, cancel, request: request?.clinicId === clinicId ? request : undefined }
}
