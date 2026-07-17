"use client"

import { Mail, Phone } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { PatientInquiryProfile } from "../../model/messages"

type PatientInquiryProfileDialogProps = Readonly<{
  canViewDetailedInquiry: boolean
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
  canViewDetailedInquiry,
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
          <Avatar
            className="size-16 text-base"
            initials={getPatientInitials(patient.name)}
            src={patient.avatar}
          />
          <div>
            <strong className="text-lg">{patient.name}</strong>
            <div className="mt-2">
              <span className="inline-flex min-h-7 items-center rounded-full bg-[var(--warning)] px-3 text-xs font-bold text-[var(--secondary)]">
                Inquiry
              </span>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-5">
          {(canViewDetailedInquiry
            ? [
                ["Age", patient.age],
                ["Gender", patient.gender],
                ["Last visit", patient.lastVisit],
                ["Interest", patient.interest],
              ]
            : [["Interest", patient.interest]]
          ).map(([label, value]) => (
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
          {canViewDetailedInquiry ? (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Phone aria-hidden="true" className="size-4" />
              <span className="sr-only">No phone number provided</span>
            </div>
          ) : null}
        </section>
        {canViewDetailedInquiry ? (
          <section aria-labelledby="patient-notes">
            <h3
              className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase"
              id="patient-notes"
            >
              Medical notes
            </h3>
            <p className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
              {patient.medicalNotes}
            </p>
          </section>
        ) : null}
      </div>
    </Modal>
  )
}
