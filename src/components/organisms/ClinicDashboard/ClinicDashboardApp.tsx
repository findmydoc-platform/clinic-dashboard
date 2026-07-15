"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { DashboardPeriodControl } from "@/components/molecules/DashboardPeriodControl"
import { ClinicDashboardTemplate } from "@/components/templates/ClinicDashboardTemplate"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { DashboardOverview } from "./DashboardOverview"
import { MessagesWorkspace } from "./MessagesWorkspace"
import { ReviewsManagement } from "./ReviewsManagement"
import { ClinicProfileEditor } from "./ClinicProfileEditor"
import { PatientProfileDialog, TeamMemberDialog, TreatmentDialog } from "./ClinicDashboardDialogs"
import type {
  ClinicDashboardDialog,
  ClinicDashboardSection,
  ClinicDashboardVariant,
} from "@/lib/clinic-dashboard/visibility"
import { isClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"
import { markAllNotificationsAsRead as getAllNotificationReadIds } from "@/lib/clinic-dashboard/notifications"
import type { DashboardReportingPeriod } from "@/lib/clinic-dashboard/reporting"

const INTERFACE_MODE_SESSION_KEY = "clinic-dashboard-interface-mode"
const INTERFACE_MODE_CHANGE_EVENT = "clinic-dashboard-interface-mode-change"
const NOTIFICATION_READ_STATE_SESSION_KEY = "clinic-dashboard-notification-read-state"
const NOTIFICATION_READ_STATE_CHANGE_EVENT = "clinic-dashboard-notification-read-state-change"

function getStoredFullInterface() {
  return window.sessionStorage.getItem(INTERFACE_MODE_SESSION_KEY) === "visual-reference"
}

function getServerFullInterface() {
  return false
}

function subscribeToInterfaceMode(onStoreChange: () => void) {
  window.addEventListener(INTERFACE_MODE_CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(INTERFACE_MODE_CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

function getStoredNotificationReadState() {
  try {
    return window.sessionStorage.getItem(NOTIFICATION_READ_STATE_SESSION_KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

function getServerNotificationReadState() {
  return "[]"
}

function getNotificationReadIds(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []
  } catch {
    return []
  }
}

function storeNotificationReadIds(ids: readonly string[]) {
  try {
    window.sessionStorage.setItem(NOTIFICATION_READ_STATE_SESSION_KEY, JSON.stringify(ids))
    window.dispatchEvent(new Event(NOTIFICATION_READ_STATE_CHANGE_EVENT))
  } catch {
    // Session storage is an optional enhancement for this local prototype.
  }
}

function subscribeToNotificationReadState(onStoreChange: () => void) {
  window.addEventListener(NOTIFICATION_READ_STATE_CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)

  return () => {
    window.removeEventListener(NOTIFICATION_READ_STATE_CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export type ClinicDashboardAppProps = {
  initialDialog?: ClinicDashboardDialog
  initialNotificationReadIds?: readonly string[]
  initialNotificationsOpen?: boolean
  initialReportingPeriod?: DashboardReportingPeriod
  initialSection?: ClinicDashboardSection
  persistInterfaceModeInSession?: boolean
  showInterfaceModeToggle?: boolean
  variant: ClinicDashboardVariant
}

export function ClinicDashboardApp({
  initialDialog,
  initialNotificationReadIds = [],
  initialNotificationsOpen = false,
  initialReportingPeriod = "30 days",
  initialSection = "dashboard",
  persistInterfaceModeInSession = false,
  showInterfaceModeToggle = false,
  variant,
}: ClinicDashboardAppProps) {
  if (!isClinicDashboardVariant(variant)) throw new Error(`Unsupported clinic dashboard variant: ${variant}`)

  const [activeSection, setActiveSection] = useState<ClinicDashboardSection>(initialSection)
  const [reportingPeriod, setReportingPeriod] = useState<DashboardReportingPeriod>(initialReportingPeriod)
  const [notificationsOpen, setNotificationsOpen] = useState(initialNotificationsOpen)
  const [localNotificationReadIds, setLocalNotificationReadIds] =
    useState<readonly string[]>(initialNotificationReadIds)
  const [localVariant, setLocalVariant] = useState<ClinicDashboardVariant>(variant)
  const storedFullInterface = useSyncExternalStore(
    subscribeToInterfaceMode,
    getStoredFullInterface,
    getServerFullInterface,
  )
  const activeVariant = persistInterfaceModeInSession
    ? storedFullInterface
      ? "visual-reference"
      : "presentation"
    : localVariant
  const storedNotificationReadState = useSyncExternalStore(
    subscribeToNotificationReadState,
    getStoredNotificationReadState,
    getServerNotificationReadState,
  )
  const notificationReadIds = persistInterfaceModeInSession
    ? getNotificationReadIds(storedNotificationReadState)
    : localNotificationReadIds
  const [patientProfileOpen, setPatientProfileOpen] = useState(initialDialog === "patient-profile")
  const [teamMemberOpen, setTeamMemberOpen] = useState(initialDialog === "team-member")
  const [treatmentOpen, setTreatmentOpen] = useState(initialDialog === "treatment")
  const patientTriggerRef = useRef<HTMLButtonElement>(null)
  const teamTriggerRef = useRef<HTMLButtonElement>(null)
  const treatmentTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 })
  }, [activeSection])

  const setShowFullInterface = (show: boolean) => {
    const nextVariant = show ? "visual-reference" : "presentation"
    if (!show) setNotificationsOpen(false)
    if (persistInterfaceModeInSession) {
      window.sessionStorage.setItem(INTERFACE_MODE_SESSION_KEY, nextVariant)
      window.dispatchEvent(new Event(INTERFACE_MODE_CHANGE_EVENT))
      return
    }

    setLocalVariant(nextVariant)
  }

  const showDashboardReportingControls = activeSection === "dashboard" && activeVariant === "visual-reference"
  const notifications = clinicDashboardFixture.notifications

  const markAllNotificationsAsRead = () => {
    const nextReadIds = getAllNotificationReadIds(notifications, notificationReadIds)
    if (persistInterfaceModeInSession) {
      storeNotificationReadIds(nextReadIds)
      return
    }

    setLocalNotificationReadIds(nextReadIds)
  }

  return (
    <ClinicDashboardTemplate
      activeSection={activeSection}
      headerActions={
        showDashboardReportingControls ? (
          <DashboardPeriodControl onChange={setReportingPeriod} period={reportingPeriod} />
        ) : undefined
      }
      notificationOpen={notificationsOpen}
      notificationReadIds={notificationReadIds}
      notifications={notifications}
      onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
      onNavigate={setActiveSection}
      onNotificationOpenChange={setNotificationsOpen}
      onShowFullInterfaceChange={setShowFullInterface}
      showFullInterface={activeVariant === "visual-reference"}
      showInterfaceModeToggle={showInterfaceModeToggle}
      variant={activeVariant}
    >
      {activeSection === "dashboard" ? (
        <DashboardOverview period={reportingPeriod} variant={activeVariant} />
      ) : null}
      {activeSection === "messages" ? (
        <MessagesWorkspace onOpenPatientProfile={() => setPatientProfileOpen(true)} variant={activeVariant} />
      ) : null}
      {activeSection === "reviews" ? <ReviewsManagement variant={activeVariant} /> : null}
      {activeSection === "profile" ? (
        <ClinicProfileEditor
          onOpenTeamDialog={() => setTeamMemberOpen(true)}
          onOpenTreatmentDialog={() => setTreatmentOpen(true)}
          variant={activeVariant}
        />
      ) : null}
      <PatientProfileDialog
        onOpenChange={setPatientProfileOpen}
        open={patientProfileOpen}
        triggerRef={patientTriggerRef}
        variant={activeVariant}
      />
      <TreatmentDialog
        onOpenChange={setTreatmentOpen}
        open={treatmentOpen}
        triggerRef={treatmentTriggerRef}
        variant={activeVariant}
      />
      <TeamMemberDialog
        onOpenChange={setTeamMemberOpen}
        open={teamMemberOpen}
        triggerRef={teamTriggerRef}
        variant={activeVariant}
      />
    </ClinicDashboardTemplate>
  )
}
