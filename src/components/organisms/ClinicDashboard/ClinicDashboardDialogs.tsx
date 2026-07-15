"use client"

import { Camera, Info, Mail } from "lucide-react"
import { AvatarInitials } from "@/components/atoms/DashboardPrimitives"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { getVisibilityBehavior, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"

type DialogProps = {
  onOpenChange: (open: boolean) => void
  open: boolean
  triggerRef?: React.RefObject<HTMLButtonElement | null>
  variant: ClinicDashboardVariant
}

export function PatientProfileDialog({ onOpenChange, open, triggerRef, variant }: DialogProps) {
  const patient = clinicDashboardFixture.patient
  const fullReference = variant === "visual-reference"

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
      title="Patient profile"
      triggerRef={triggerRef}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <AvatarInitials className="size-16 text-base" initials="LW" src={patient.avatar} />
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
          {(fullReference
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
        </section>
        {fullReference ? (
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

export function TreatmentDialog({ onOpenChange, open, triggerRef, variant }: DialogProps) {
  const readOnly = getVisibilityBehavior(variant, "profileWrites") === "read-only"
  return (
    <Modal
      description="Add a treatment to the public clinic profile."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          {!readOnly ? <Button>Save treatment</Button> : null}
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Create new treatment"
      triggerRef={triggerRef}
    >
      <fieldset className="grid gap-5" disabled={readOnly}>
        <label className="grid gap-2 text-sm font-bold">
          Treatment name
          <input
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]"
            placeholder="e.g. Express whitening"
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">
            Category
            <select className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]">
              <option>Select…</option>
              <option>Dentistry</option>
              <option>Aesthetics</option>
              <option>Orthopaedics</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Duration (minutes)
            <input
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]"
              inputMode="numeric"
              placeholder="30"
            />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">
            Price (€)
            <input
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]"
              inputMode="decimal"
              placeholder="0.00"
            />
          </label>
          <div className="flex items-end pb-3 text-sm text-[var(--foreground)]">
            <Info aria-hidden="true" className="mr-2 size-4" /> Price includes VAT
          </div>
        </div>
        <label className="grid gap-2 text-sm font-bold">
          Description
          <textarea
            className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-normal disabled:bg-[var(--surface)]"
            placeholder="Describe the treatment process…"
          />
        </label>
      </fieldset>
    </Modal>
  )
}

export function TeamMemberDialog({ onOpenChange, open, triggerRef, variant }: DialogProps) {
  const readOnly = getVisibilityBehavior(variant, "teamWrites") === "read-only"
  return (
    <Modal
      description="Add a team member to the public clinic profile."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          {!readOnly ? <Button>Add team member</Button> : null}
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Add team member"
      triggerRef={triggerRef}
    >
      <fieldset className="grid gap-5" disabled={readOnly}>
        <div className="flex flex-wrap items-center gap-4">
          <button
            aria-label="Choose profile image"
            className="inline-flex size-24 items-center justify-center rounded-full border-2 border-dashed border-[var(--primary)] bg-[var(--surface)]"
            type="button"
          >
            <Camera aria-hidden="true" className="size-7" />
          </button>
          <div>
            <strong>Upload profile image</strong>
            <p className="mt-1 max-w-sm text-sm text-[var(--foreground)]">
              PNG or JPG up to 5 MB. Recommended format: square.
            </p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">
            First name
            <input
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]"
              placeholder="e.g. Anna"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Last name
            <input
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]"
              placeholder="e.g. Schmidt"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-bold">
          Specialty / role
          <select className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:bg-[var(--surface)]">
            <option>Select role…</option>
            <option>Medical assistant</option>
            <option>Clinic management</option>
            <option>Patient coordinator</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Short biography
          <textarea
            className="min-h-28 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 font-normal disabled:bg-[var(--surface)]"
            placeholder="Describe the team member's experience and expertise…"
          />
        </label>
      </fieldset>
    </Modal>
  )
}
