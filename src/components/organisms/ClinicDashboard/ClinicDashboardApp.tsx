"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { ClinicDashboardTemplate } from "@/components/templates/ClinicDashboardTemplate"
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

const INTERFACE_MODE_SESSION_KEY = "clinic-dashboard-interface-mode"
const INTERFACE_MODE_CHANGE_EVENT = "clinic-dashboard-interface-mode-change"

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

export type ClinicDashboardAppProps = {
  initialDialog?: ClinicDashboardDialog
  initialSection?: ClinicDashboardSection
  persistInterfaceModeInSession?: boolean
  showInterfaceModeToggle?: boolean
  variant: ClinicDashboardVariant
}

export function ClinicDashboardApp({
  initialDialog,
  initialSection = "dashboard",
  persistInterfaceModeInSession = false,
  showInterfaceModeToggle = false,
  variant,
}: ClinicDashboardAppProps) {
  if (!isClinicDashboardVariant(variant)) throw new Error(`Unsupported clinic dashboard variant: ${variant}`)

  const [activeSection, setActiveSection] = useState<ClinicDashboardSection>(initialSection)
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
    if (persistInterfaceModeInSession) {
      window.sessionStorage.setItem(INTERFACE_MODE_SESSION_KEY, nextVariant)
      window.dispatchEvent(new Event(INTERFACE_MODE_CHANGE_EVENT))
      return
    }

    setLocalVariant(nextVariant)
  }

  return (
    <ClinicDashboardTemplate
      activeSection={activeSection}
      onNavigate={setActiveSection}
      onShowFullInterfaceChange={setShowFullInterface}
      showFullInterface={activeVariant === "visual-reference"}
      showInterfaceModeToggle={showInterfaceModeToggle}
      variant={activeVariant}
    >
      {activeSection === "dashboard" ? <DashboardOverview variant={activeVariant} /> : null}
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
