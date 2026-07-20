"use client"

import { Mail, MessageSquareText, Phone } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { PatientInquiryProfile } from "../../model/messages"

type PatientInquiryProfileDialogProps = Readonly<{
  onOpenChange: (open: boolean) => void
  open: boolean
  patient: PatientInquiryProfile
}>

function getPatientInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("en") ?? "")
    .join("")
}

export function PatientInquiryProfileDialog({
  onOpenChange,
  open,
  patient,
}: PatientInquiryProfileDialogProps) {
  return (
    <Modal
      footer={
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Patient inquiry"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 text-base" initials={getPatientInitials(patient.name)} />
          <div className="min-w-0 flex-1">
            <strong className="text-lg">{patient.name}</strong>
          </div>
        </div>

        <dl className="grid gap-5 sm:grid-cols-2">
          {[
            ["Interest", patient.interest],
            ["Treatment timeline", patient.treatmentTimeline],
            ["Preferred contact window", patient.contactWindow],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">{label}</dt>
              <dd className="mt-1 font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="patient-contact">
          <h3
            className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase"
            id="patient-contact"
          >
            Contact
          </h3>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Mail aria-hidden="true" className="size-4" /> {patient.email}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Phone aria-hidden="true" className="size-4" /> {patient.phone}
          </div>
        </section>

        <section aria-labelledby="inquiry-message">
          <h3
            className="flex items-center gap-2 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase"
            id="inquiry-message"
          >
            <MessageSquareText aria-hidden="true" className="size-4" /> Original message
          </h3>
          <p className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
            {patient.message}
          </p>
        </section>
      </div>
    </Modal>
  )
}
