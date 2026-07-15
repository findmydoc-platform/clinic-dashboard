"use client"

import { useEffect, useRef, useState } from "react"
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

export type ClinicDashboardAppProps = {
  initialDialog?: ClinicDashboardDialog
  initialSection?: ClinicDashboardSection
  variant: ClinicDashboardVariant
}

export function ClinicDashboardApp({
  initialDialog,
  initialSection = "dashboard",
  variant,
}: ClinicDashboardAppProps) {
  if (!isClinicDashboardVariant(variant)) throw new Error(`Unsupported clinic dashboard variant: ${variant}`)

  const [activeSection, setActiveSection] = useState<ClinicDashboardSection>(initialSection)
  const [patientProfileOpen, setPatientProfileOpen] = useState(initialDialog === "patient-profile")
  const [teamMemberOpen, setTeamMemberOpen] = useState(initialDialog === "team-member")
  const [treatmentOpen, setTreatmentOpen] = useState(initialDialog === "treatment")
  const patientTriggerRef = useRef<HTMLButtonElement>(null)
  const teamTriggerRef = useRef<HTMLButtonElement>(null)
  const treatmentTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 })
  }, [activeSection])

  return (
    <ClinicDashboardTemplate activeSection={activeSection} onNavigate={setActiveSection} variant={variant}>
      {activeSection === "dashboard" ? <DashboardOverview variant={variant} /> : null}
      {activeSection === "messages" ? (
        <MessagesWorkspace onOpenPatientProfile={() => setPatientProfileOpen(true)} variant={variant} />
      ) : null}
      {activeSection === "reviews" ? <ReviewsManagement variant={variant} /> : null}
      {activeSection === "profile" ? (
        <ClinicProfileEditor
          onOpenTeamDialog={() => setTeamMemberOpen(true)}
          onOpenTreatmentDialog={() => setTreatmentOpen(true)}
          variant={variant}
        />
      ) : null}
      <PatientProfileDialog
        onOpenChange={setPatientProfileOpen}
        open={patientProfileOpen}
        triggerRef={patientTriggerRef}
        variant={variant}
      />
      <TreatmentDialog
        onOpenChange={setTreatmentOpen}
        open={treatmentOpen}
        triggerRef={treatmentTriggerRef}
        variant={variant}
      />
      <TeamMemberDialog
        onOpenChange={setTeamMemberOpen}
        open={teamMemberOpen}
        triggerRef={teamTriggerRef}
        variant={variant}
      />
    </ClinicDashboardTemplate>
  )
}
