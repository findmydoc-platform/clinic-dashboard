"use client"

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react"
import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardProfileTask } from "@/features/clinic-dashboard/dashboard/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { clinicDashboardLocationSelectionReducer, type ClinicDashboardLocationId } from "./model/locations"
import { markAllNotificationsAsRead, type ClinicDashboardNotification } from "./model/notifications"
import type { ClinicDashboardSection } from "./model/workspace"
import {
  getStoredNotificationReadState,
  getStoredPrototypeMode,
  parseNotificationReadIds,
  storeNotificationReadIds,
  storePrototypeMode,
} from "./browser-session"

const getNoStoredNotificationReadState = () => undefined
const getNoStoredPrototypeMode = () => undefined
const subscribeToStaticSnapshot = () => () => undefined

type UseClinicDashboardControllerOptions = Readonly<{
  initialNotificationReadIds: readonly string[]
  initialNotificationsOpen: boolean
  initialPatientInquiryOpen: boolean
  initialLocationId: ClinicDashboardLocationId
  initialProfileTask: DashboardProfileTask
  initialSection: ClinicDashboardSection
  notifications: readonly ClinicDashboardNotification[]
  persistWorkspaceStateInSession: boolean
  prototypeMode: ClinicDashboardPrototypeMode
}>

export function useClinicDashboardController({
  initialNotificationReadIds,
  initialNotificationsOpen,
  initialPatientInquiryOpen,
  initialLocationId,
  initialProfileTask,
  initialSection,
  notifications,
  persistWorkspaceStateInSession,
  prototypeMode,
}: UseClinicDashboardControllerOptions) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [selectedLocationId, dispatchLocationSelection] = useReducer(
    clinicDashboardLocationSelectionReducer,
    initialLocationId,
  )
  const [notificationsOpen, setNotificationsOpen] = useState(initialNotificationsOpen)
  const [notificationReadIdsOverride, setNotificationReadIdsOverride] = useState<readonly string[]>()
  const [prototypeModeOverride, setPrototypeModeOverride] = useState<ClinicDashboardPrototypeMode>()
  const [patientInquiryOpen, setPatientInquiryOpen] = useState(initialPatientInquiryOpen)
  const [selectedProfileTask, setSelectedProfileTask] = useState(initialProfileTask)
  const [profileTaskOpen, setProfileTaskOpen] = useState(false)
  const [profileFocusTarget, setProfileFocusTarget] = useState<ClinicProfileFocusTarget>()
  const [reviewsFocusRequested, setReviewsFocusRequested] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  const storedPrototypeMode = useSyncExternalStore(
    subscribeToStaticSnapshot,
    persistWorkspaceStateInSession ? getStoredPrototypeMode : getNoStoredPrototypeMode,
    getNoStoredPrototypeMode,
  )
  const storedNotificationReadState = useSyncExternalStore(
    subscribeToStaticSnapshot,
    persistWorkspaceStateInSession ? getStoredNotificationReadState : getNoStoredNotificationReadState,
    getNoStoredNotificationReadState,
  )
  const storedNotificationReadIds = useMemo(
    () => parseNotificationReadIds(storedNotificationReadState),
    [storedNotificationReadState],
  )
  const activePrototypeMode = prototypeModeOverride ?? storedPrototypeMode ?? prototypeMode
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
    setReviewsFocusRequested(true)
    setActiveSection("reviews")
  }, [])

  const openProfileTask = useCallback((task: DashboardProfileTask) => {
    setSelectedProfileTask(task)
    setProfileTaskOpen(true)
  }, [])

  const openSupport = useCallback(() => setSupportOpen(true), [])

  const selectLocation = useCallback((locationId: ClinicDashboardLocationId) => {
    dispatchLocationSelection({ locationId, type: "location-selected" })
  }, [])

  const clearProfileFocusRequest = useCallback(() => {
    setProfileFocusTarget(undefined)
  }, [])

  const clearReviewsFocusRequest = useCallback(() => {
    setReviewsFocusRequested(false)
  }, [])

  const openPatientInquiry = useCallback(() => {
    setPatientInquiryOpen(true)
  }, [])

  const setShowFullInterface = useCallback(
    (show: boolean) => {
      const nextPrototypeMode: ClinicDashboardPrototypeMode = show ? "visual-reference" : "presentation"
      if (!show) {
        setActiveSection((section) =>
          section === "subscriptions" || section === "certificates-accreditations" ? "dashboard" : section,
        )
        setNotificationsOpen(false)
        setProfileTaskOpen((open) => (selectedProfileTask.visibility === "full-interface" ? false : open))
        setSupportOpen(false)
      }

      setPrototypeModeOverride(nextPrototypeMode)
      if (persistWorkspaceStateInSession) storePrototypeMode(nextPrototypeMode)
    },
    [persistWorkspaceStateInSession, selectedProfileTask.visibility],
  )

  const markAllNotificationsRead = useCallback(() => {
    const nextReadIds = markAllNotificationsAsRead(notifications, notificationReadIds)

    setNotificationReadIdsOverride(nextReadIds)
    if (persistWorkspaceStateInSession) storeNotificationReadIds(nextReadIds)
  }, [notificationReadIds, notifications, persistWorkspaceStateInSession])

  return {
    actions: {
      clearProfileFocusRequest,
      clearReviewsFocusRequest,
      markAllNotificationsRead,
      navigate,
      navigateToProfileTarget,
      navigateToReviews,
      openPatientInquiry,
      openProfileTask,
      openSupport,
      selectLocation,
      setNotificationsOpen,
      setPatientInquiryOpen,
      setProfileTaskOpen,
      setShowFullInterface,
      setSupportOpen,
    },
    model: {
      activeSection,
      activePrototypeMode,
      notificationReadIds,
      notificationsOpen,
      patientInquiryOpen,
      profileFocusTarget,
      profileTaskOpen,
      reviewsFocusRequested,
      selectedLocationId,
      selectedProfileTask,
      supportOpen,
    },
  } as const
}
