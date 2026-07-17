"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardProfileTask } from "@/features/clinic-dashboard/dashboard/public"
import type { ClinicDashboardPrototypeMode } from "@/features/clinic-dashboard/prototype/public"
import { markAllNotificationsAsRead, type ClinicDashboardNotification } from "./model/notifications"
import type { ClinicDashboardSection } from "./model/workspace"
import {
  getServerPrototypeMode,
  getServerNotificationReadState,
  getStoredPrototypeMode,
  getStoredNotificationReadState,
  parseNotificationReadIds,
  storeAllNotificationsRead,
  storePrototypeMode,
  subscribeToPrototypeMode,
  subscribeToNotificationReadState,
} from "./browser-session"

type UseClinicDashboardControllerOptions = Readonly<{
  initialNotificationReadIds: readonly string[]
  initialNotificationsOpen: boolean
  initialPatientInquiryOpen: boolean
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
  initialProfileTask,
  initialSection,
  notifications,
  persistWorkspaceStateInSession,
  prototypeMode,
}: UseClinicDashboardControllerOptions) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [notificationsOpen, setNotificationsOpen] = useState(initialNotificationsOpen)
  const [localNotificationReadIds, setLocalNotificationReadIds] =
    useState<readonly string[]>(initialNotificationReadIds)
  const [localPrototypeMode, setLocalPrototypeMode] = useState(prototypeMode)
  const [patientInquiryOpen, setPatientInquiryOpen] = useState(initialPatientInquiryOpen)
  const [selectedProfileTask, setSelectedProfileTask] = useState(initialProfileTask)
  const [profileTaskOpen, setProfileTaskOpen] = useState(false)
  const [profileFocusTarget, setProfileFocusTarget] = useState<ClinicProfileFocusTarget>()
  const [reviewsFocusRequested, setReviewsFocusRequested] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

  const storedPrototypeMode = useSyncExternalStore(
    subscribeToPrototypeMode,
    getStoredPrototypeMode,
    getServerPrototypeMode,
  )
  const storedNotificationReadState = useSyncExternalStore(
    subscribeToNotificationReadState,
    getStoredNotificationReadState,
    getServerNotificationReadState,
  )
  const activePrototypeMode = persistWorkspaceStateInSession ? storedPrototypeMode : localPrototypeMode
  const notificationReadIds = persistWorkspaceStateInSession
    ? parseNotificationReadIds(storedNotificationReadState)
    : localNotificationReadIds

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
        setNotificationsOpen(false)
        setProfileTaskOpen((open) => (selectedProfileTask.visibility === "full-interface" ? false : open))
        setSupportOpen(false)
      }

      if (persistWorkspaceStateInSession) {
        storePrototypeMode(nextPrototypeMode)
        return
      }

      setLocalPrototypeMode(nextPrototypeMode)
    },
    [persistWorkspaceStateInSession, selectedProfileTask.visibility],
  )

  const markAllNotificationsRead = useCallback(() => {
    if (persistWorkspaceStateInSession) {
      storeAllNotificationsRead(notifications, notificationReadIds)
      return
    }

    setLocalNotificationReadIds((current) => markAllNotificationsAsRead(notifications, current))
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
      selectedProfileTask,
      supportOpen,
    },
  } as const
}
