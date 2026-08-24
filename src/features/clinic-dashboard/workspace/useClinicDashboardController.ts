"use client"

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react"
import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardProfileTask } from "@/features/clinic-dashboard/dashboard/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import type { ReviewFocusTarget } from "@/features/clinic-dashboard/reviews/public"
import { clinicDashboardLocationSelectionReducer, type ClinicDashboardLocationId } from "./model/locations"
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type ClinicDashboardNotification,
} from "./model/notifications"
import type { ClinicDashboardSection } from "./model/workspace"
import {
  getStoredNotificationReadState,
  parseNotificationReadIds,
  storeNotificationReadIds,
} from "./browser-session"

const getNoStoredNotificationReadState = () => undefined
const subscribeToStaticSnapshot = () => () => undefined

type UseClinicDashboardControllerOptions = Readonly<{
  initialNotificationReadIds: readonly string[]
  initialNotificationsOpen: boolean
  initialLocationId: ClinicDashboardLocationId
  initialProfileTask?: DashboardProfileTask
  initialSection: ClinicDashboardSection
  notifications: readonly ClinicDashboardNotification[]
  persistNotificationReadStateInSession: boolean
  prototypeMode: ClinicDashboardPrototypeMode
}>

export function useClinicDashboardController({
  initialNotificationReadIds,
  initialNotificationsOpen,
  initialLocationId,
  initialProfileTask,
  initialSection,
  notifications,
  persistNotificationReadStateInSession,
  prototypeMode,
}: UseClinicDashboardControllerOptions) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [selectedLocationId, dispatchLocationSelection] = useReducer(
    clinicDashboardLocationSelectionReducer,
    initialLocationId,
  )
  const [locationAnnouncement, setLocationAnnouncement] = useState("")
  const [locationChangeCount, setLocationChangeCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(initialNotificationsOpen)
  const [notificationReadIdsOverride, setNotificationReadIdsOverride] = useState<readonly string[]>()
  const [prototypeModeOverride, setPrototypeModeOverride] = useState<ClinicDashboardPrototypeMode>()
  const [profileTaskDialog, setProfileTaskDialog] = useState<
    Readonly<{
      open: boolean
      sourceTask?: DashboardProfileTask
      task?: DashboardProfileTask
    }>
  >({ open: false })
  const [profileFocusTarget, setProfileFocusTarget] = useState<ClinicProfileFocusTarget>()
  const [messageFocusTarget, setMessageFocusTarget] = useState<"heading">()
  const [reviewFocusTarget, setReviewFocusTarget] = useState<ReviewFocusTarget>()
  const [supportOpen, setSupportOpen] = useState(false)

  const storedNotificationReadState = useSyncExternalStore(
    subscribeToStaticSnapshot,
    persistNotificationReadStateInSession ? getStoredNotificationReadState : getNoStoredNotificationReadState,
    getNoStoredNotificationReadState,
  )
  const storedNotificationReadIds = useMemo(
    () => parseNotificationReadIds(storedNotificationReadState),
    [storedNotificationReadState],
  )
  const activePrototypeMode = prototypeModeOverride ?? prototypeMode
  const notificationReadIds =
    notificationReadIdsOverride ?? storedNotificationReadIds ?? initialNotificationReadIds

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 })
  }, [activeSection])

  const profileTaskDialogMatchesSource = profileTaskDialog.sourceTask === initialProfileTask
  const selectedProfileTask = profileTaskDialogMatchesSource
    ? (profileTaskDialog.task ?? initialProfileTask)
    : initialProfileTask
  const profileTaskOpen =
    profileTaskDialog.open && profileTaskDialogMatchesSource && selectedProfileTask !== undefined

  const navigate = useCallback((section: ClinicDashboardSection) => {
    setActiveSection(section)
  }, [])

  const navigateToProfileTarget = useCallback((destination: ClinicProfileFocusTarget) => {
    setProfileTaskDialog((current) => ({ ...current, open: false }))
    setProfileFocusTarget(destination)
    setActiveSection("profile")
  }, [])

  const navigateToReviews = useCallback(() => {
    setReviewFocusTarget({ kind: "heading" })
    setActiveSection("reviews")
  }, [])

  const openProfileTask = useCallback(
    (task: DashboardProfileTask) => {
      setProfileTaskDialog({ open: true, sourceTask: initialProfileTask, task })
    },
    [initialProfileTask],
  )

  const setProfileTaskOpen = useCallback(
    (open: boolean) => {
      setProfileTaskDialog((current) =>
        open
          ? { open: true, sourceTask: initialProfileTask, task: selectedProfileTask }
          : { ...current, open: false },
      )
    },
    [initialProfileTask, selectedProfileTask],
  )

  const openSupport = useCallback(() => setSupportOpen(true), [])

  const selectLocation = useCallback((locationId: ClinicDashboardLocationId, locationName: string) => {
    dispatchLocationSelection({ locationId, type: "location-selected" })
    setLocationAnnouncement(`Location changed to ${locationName}.`)
    setLocationChangeCount((count) => count + 1)
    setProfileTaskDialog({ open: false })
    setProfileFocusTarget(undefined)
    setMessageFocusTarget(undefined)
    setReviewFocusTarget(undefined)
    setSupportOpen(false)
  }, [])

  const clearProfileFocusRequest = useCallback(() => {
    setProfileFocusTarget(undefined)
  }, [])

  const clearMessageFocusRequest = useCallback(() => {
    setMessageFocusTarget(undefined)
  }, [])

  const clearReviewFocusRequest = useCallback(() => {
    setReviewFocusTarget(undefined)
  }, [])

  const setShowFullInterface = useCallback((show: boolean) => {
    const nextPrototypeMode: ClinicDashboardPrototypeMode = show ? "visual-reference" : "presentation"
    if (!show) setNotificationsOpen(false)

    setPrototypeModeOverride(nextPrototypeMode)
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    const nextReadIds = markAllNotificationsAsRead(notifications, notificationReadIds)

    setNotificationReadIdsOverride(nextReadIds)
    if (persistNotificationReadStateInSession) storeNotificationReadIds(nextReadIds)
  }, [notificationReadIds, notifications, persistNotificationReadStateInSession])

  const openNotification = useCallback(
    (notification: ClinicDashboardNotification, locationName: string) => {
      const nextReadIds = markNotificationAsRead(notification.id, notificationReadIds)
      setNotificationReadIdsOverride(nextReadIds)
      if (persistNotificationReadStateInSession) storeNotificationReadIds(nextReadIds)

      dispatchLocationSelection({ locationId: notification.locationId, type: "location-selected" })
      setLocationChangeCount((count) => count + 1)
      setNotificationsOpen(false)
      setProfileTaskDialog({ open: false })
      setProfileFocusTarget(undefined)
      setSupportOpen(false)

      if (notification.target.kind === "messages") {
        setMessageFocusTarget("heading")
        setReviewFocusTarget(undefined)
        setActiveSection("messages")
        setLocationAnnouncement(`Opened messages at ${locationName}.`)
        return
      }

      setMessageFocusTarget(undefined)
      setReviewFocusTarget({ kind: "review", reviewId: notification.target.reviewId })
      setActiveSection("reviews")
      setLocationAnnouncement(`Opened review at ${locationName}.`)
    },
    [notificationReadIds, persistNotificationReadStateInSession],
  )

  return {
    actions: {
      clearProfileFocusRequest,
      clearMessageFocusRequest,
      clearReviewFocusRequest,
      markAllNotificationsRead,
      navigate,
      navigateToProfileTarget,
      navigateToReviews,
      openNotification,
      openProfileTask,
      openSupport,
      selectLocation,
      setNotificationsOpen,
      setProfileTaskOpen,
      setShowFullInterface,
      setSupportOpen,
    },
    model: {
      activeSection,
      activePrototypeMode,
      locationAnnouncement,
      locationChangeCount,
      messageFocusTarget,
      notificationReadIds,
      notificationsOpen,
      profileFocusTarget,
      profileTaskOpen,
      reviewFocusTarget,
      selectedLocationId,
      selectedProfileTask,
      supportOpen,
    },
  } as const
}
