"use client"

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react"
import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardProfileTask } from "@/features/clinic-dashboard/dashboard/public"
import type { MessageFocusTarget } from "@/features/clinic-dashboard/messages/public"
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
  initialProfileTask: DashboardProfileTask
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
  const [selectedProfileTask, setSelectedProfileTask] = useState(initialProfileTask)
  const [profileTaskOpen, setProfileTaskOpen] = useState(false)
  const [profileFocusTarget, setProfileFocusTarget] = useState<ClinicProfileFocusTarget>()
  const [messageFocusTarget, setMessageFocusTarget] = useState<MessageFocusTarget>()
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

  const navigate = useCallback((section: ClinicDashboardSection) => {
    setActiveSection(section)
  }, [])

  const navigateToProfileTarget = useCallback((destination: ClinicProfileFocusTarget) => {
    setProfileTaskOpen(false)
    setProfileFocusTarget(destination)
    setActiveSection("profile")
  }, [])

  const navigateToReviews = useCallback(() => {
    setReviewFocusTarget({ kind: "heading" })
    setActiveSection("reviews")
  }, [])

  const openProfileTask = useCallback((task: DashboardProfileTask) => {
    setSelectedProfileTask(task)
    setProfileTaskOpen(true)
  }, [])

  const openSupport = useCallback(() => setSupportOpen(true), [])

  const selectLocation = useCallback(
    (locationId: ClinicDashboardLocationId, locationName: string, profileTask: DashboardProfileTask) => {
      dispatchLocationSelection({ locationId, type: "location-selected" })
      setLocationAnnouncement(`Location changed to ${locationName}.`)
      setLocationChangeCount((count) => count + 1)
      setProfileTaskOpen(false)
      setSelectedProfileTask(profileTask)
      setProfileFocusTarget(undefined)
      setMessageFocusTarget(undefined)
      setReviewFocusTarget(undefined)
      setSupportOpen(false)
    },
    [],
  )

  const clearProfileFocusRequest = useCallback(() => {
    setProfileFocusTarget(undefined)
  }, [])

  const clearMessageFocusRequest = useCallback(() => {
    setMessageFocusTarget(undefined)
  }, [])

  const clearReviewFocusRequest = useCallback(() => {
    setReviewFocusTarget(undefined)
  }, [])

  const setShowFullInterface = useCallback(
    (show: boolean) => {
      const nextPrototypeMode: ClinicDashboardPrototypeMode = show ? "visual-reference" : "presentation"
      if (!show) {
        setNotificationsOpen(false)
        setProfileTaskOpen((open) => (selectedProfileTask.visibility === "full-interface" ? false : open))
      }

      setPrototypeModeOverride(nextPrototypeMode)
    },
    [selectedProfileTask.visibility],
  )

  const markAllNotificationsRead = useCallback(() => {
    const nextReadIds = markAllNotificationsAsRead(notifications, notificationReadIds)

    setNotificationReadIdsOverride(nextReadIds)
    if (persistNotificationReadStateInSession) storeNotificationReadIds(nextReadIds)
  }, [notificationReadIds, notifications, persistNotificationReadStateInSession])

  const openNotification = useCallback(
    (notification: ClinicDashboardNotification, locationName: string, profileTask: DashboardProfileTask) => {
      const nextReadIds = markNotificationAsRead(notification.id, notificationReadIds)
      setNotificationReadIdsOverride(nextReadIds)
      if (persistNotificationReadStateInSession) storeNotificationReadIds(nextReadIds)

      dispatchLocationSelection({ locationId: notification.locationId, type: "location-selected" })
      setLocationChangeCount((count) => count + 1)
      setNotificationsOpen(false)
      setProfileTaskOpen(false)
      setSelectedProfileTask(profileTask)
      setProfileFocusTarget(undefined)
      setSupportOpen(false)

      if (notification.target.kind === "conversation") {
        setMessageFocusTarget({ conversationId: notification.target.conversationId })
        setReviewFocusTarget(undefined)
        setActiveSection("messages")
        setLocationAnnouncement(`Opened conversation at ${locationName}.`)
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
