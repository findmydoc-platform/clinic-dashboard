"use client"

import { forwardRef, useState } from "react"
import { Pencil, UserPlus } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { DoctorDirectorySnapshot, DoctorProfile } from "../../model/doctor-profile"
import type { DoctorProfileCommands } from "../../model/doctor-profile-commands"
import { saveDoctorProfileDraft, type DoctorProfileDraft } from "../../model/doctor-profile-editor"
import { DoctorProfileDialog } from "./DoctorProfileDialog"

type DoctorDirectoryProps = Readonly<{
  canManage: boolean
  commands: DoctorProfileCommands
  onDoctorsChange?: (doctors: readonly DoctorProfile[]) => void
  snapshot: DoctorDirectorySnapshot
}>

function sortDoctors(doctors: readonly DoctorProfile[]) {
  return [...doctors].sort(
    (left, right) =>
      left.lastName.localeCompare(right.lastName, "en") ||
      left.firstName.localeCompare(right.firstName, "en"),
  )
}

function initials(doctor: DoctorProfile) {
  return `${doctor.firstName[0] ?? ""}${doctor.lastName[0] ?? ""}`.toUpperCase()
}

export const DoctorDirectory = forwardRef<HTMLElement, DoctorDirectoryProps>(function DoctorDirectory(
  { canManage, commands, onDoctorsChange, snapshot },
  ref,
) {
  const [doctors, setDoctors] = useState(() => sortDoctors(snapshot.doctors))
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogSession, setDialogSession] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const isReady = snapshot.status === "ready"

  const openDoctor = (doctor?: DoctorProfile) => {
    if (!canManage || !isReady) return
    setSelectedDoctor(doctor)
    setDialogSession((session) => session + 1)
    setDialogOpen(true)
  }

  const saveDoctor = async (draft: DoctorProfileDraft, persistedDoctor?: DoctorProfile) => {
    const result = await saveDoctorProfileDraft(commands, draft, persistedDoctor)
    if (result.doctor) {
      const nextDoctors = sortDoctors([
        ...doctors.filter(({ id }) => id !== result.doctor?.id),
        result.doctor,
      ])
      setDoctors(nextDoctors)
      onDoctorsChange?.(nextDoctors)
    }
    if (result.status === "saved") {
      setStatusMessage(
        result.doctor ? `${result.doctor.firstName} ${result.doctor.lastName} saved.` : "Doctor saved.",
      )
    } else if (result.status === "partial") {
      setStatusMessage("Some doctor changes were saved. Complete the retry in the open dialog.")
    } else {
      setStatusMessage("Doctor could not be saved.")
    }
    return result
  }

  return (
    <>
      <Card
        aria-labelledby="doctor-directory-heading"
        className="scroll-mt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
        id="clinic-profile-doctors"
        ref={ref}
        tabIndex={-1}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--secondary)]" id="doctor-directory-heading">
              Doctors
            </h2>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              Active and inactive doctor profiles for this clinic.
            </p>
          </div>
          {canManage ? (
            <Button disabled={!isReady} onClick={() => openDoctor()} variant="ghost">
              <UserPlus aria-hidden="true" className="size-4" />
              Add doctor
            </Button>
          ) : null}
        </div>

        <p aria-live="polite" className="sr-only" role="status">
          {statusMessage}
        </p>

        {!isReady ? (
          <div className="p-5">
            <p className="font-bold text-[var(--secondary)]">Doctors are temporarily unavailable.</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              No profile changes can be made until the directory is available again.
            </p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-bold text-[var(--secondary)]">No doctors yet</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">
              Add the first doctor profile for this clinic.
            </p>
          </div>
        ) : (
          <div>
            {doctors.map((doctor) => {
              const fullName = `${doctor.firstName} ${doctor.lastName}`
              return (
                <div
                  className="flex items-center gap-4 border-b border-[var(--border)] p-5 last:border-0"
                  key={doctor.id}
                >
                  <Avatar className="size-14" initials={initials(doctor)} src={doctor.image?.url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <strong>{fullName}</strong>
                      <span
                        className={
                          doctor.active
                            ? "rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--secondary)]"
                            : "rounded-full border border-[var(--border)] px-2 py-0.5 text-xs font-bold"
                        }
                      >
                        {doctor.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-[var(--foreground)]">
                      {doctor.specialties.length
                        ? doctor.specialties
                            .map(
                              ({ medicalSpecialtyName, specializationLevel }) =>
                                `${medicalSpecialtyName} · ${specializationLevel}`,
                            )
                            .join(", ")
                        : "No specialty assigned"}
                    </p>
                  </div>
                  {canManage ? (
                    <Button
                      aria-label={`Edit ${fullName}`}
                      onClick={() => openDoctor(doctor)}
                      size="icon"
                      title={`Edit ${fullName}`}
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {dialogOpen && isReady ? (
        <DoctorProfileDialog
          initialDoctor={selectedDoctor}
          key={dialogSession}
          medicalSpecialties={snapshot.medicalSpecialties}
          onOpenChange={setDialogOpen}
          onSave={saveDoctor}
          open
        />
      ) : null}
    </>
  )
})
