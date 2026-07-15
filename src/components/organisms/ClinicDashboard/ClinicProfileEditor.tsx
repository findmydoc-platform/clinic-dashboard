"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { GripHorizontal, MapPin, Plus, UserPlus } from "lucide-react"
import consultationImage from "@/assets/clinic-dashboard/consultation.jpg"
import corridorImage from "@/assets/clinic-dashboard/corridor.jpg"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import receptionImage from "@/assets/clinic-dashboard/reception.jpg"
import { AvatarInitials, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { SurfaceCard } from "@/components/molecules/DashboardCards"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import type { ClinicProfileDestination } from "@/lib/clinic-dashboard/profile-tasks"
import { getVisibilityBehavior, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"

export function ClinicProfileEditor({
  focusTarget,
  onFocusTargetHandled,
  onOpenTeamDialog,
  onOpenTreatmentDialog,
  variant,
}: {
  focusTarget?: ClinicProfileDestination
  onFocusTargetHandled: () => void
  onOpenTeamDialog: () => void
  onOpenTreatmentDialog: () => void
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.profile
  const readOnly = getVisibilityBehavior(variant, "profileWrites") === "read-only"
  const galleryRef = useRef<HTMLElement>(null)
  const teamRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!focusTarget) return

    const frame = requestAnimationFrame(() => {
      const target = focusTarget === "gallery" ? galleryRef.current : teamRef.current
      if (!target) return

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })
      target.focus({ preventScroll: true })
      onFocusTargetHandled()
    })

    return () => cancelAnimationFrame(frame)
  }, [focusTarget, onFocusTargetHandled])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm text-[var(--foreground)]">Clinics / Edit profile</p>
          <WorkspaceHeading>Clinic profile</WorkspaceHeading>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly ? (
            <>
              <Button variant="outline">Cancel</Button>
              <Button>Save changes</Button>
            </>
          ) : null}
        </div>
      </div>

      <section
        aria-label="Clinic image gallery"
        className="grid h-[32rem] scroll-mt-6 grid-cols-2 grid-rows-4 gap-2 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:h-96 sm:grid-cols-4 sm:grid-rows-2"
        id="clinic-profile-gallery"
        ref={galleryRef}
        tabIndex={-1}
      >
        <div className="relative col-span-2 row-span-2">
          <Image
            alt="Berlin Health Clinic reception"
            className="object-cover"
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            src={receptionImage}
          />
        </div>
        <div className="relative">
          <Image
            alt="Berlin Health Clinic exterior"
            className="object-cover"
            fill
            loading="eager"
            sizes="(min-width: 768px) 25vw, 50vw"
            src={exteriorImage}
          />
        </div>
        <div className="relative">
          <Image
            alt="Patient consultation at Berlin Health Clinic"
            className="object-cover"
            fill
            sizes="(min-width: 768px) 25vw, 50vw"
            src={consultationImage}
          />
        </div>
        <div className="relative col-span-2">
          <Image
            alt="Berlin Health Clinic corridor"
            className="object-cover"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            src={corridorImage}
          />
          <span className="absolute right-3 bottom-3 rounded-full bg-[var(--background)] px-3 py-1 text-xs font-bold text-[var(--foreground)] shadow">
            +12 more images
          </span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <SurfaceCard className="p-5 sm:p-6">
            <div className="grid gap-5">
              <label className="grid gap-2 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                Clinic name
                <input
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-base font-bold text-[var(--foreground)] disabled:bg-[var(--surface)]"
                  defaultValue={data.name}
                  disabled={readOnly}
                />
              </label>
              <label className="grid gap-2 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                Description
                <textarea
                  className="min-h-32 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm leading-6 text-[var(--foreground)] disabled:bg-[var(--surface)]"
                  defaultValue={data.description}
                  disabled={readOnly}
                />
              </label>
              <div>
                <div className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                  Specialties
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.specialties.map((item) => (
                    <span
                      className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--on-primary)]"
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                  {!readOnly ? (
                    <Button size="small" variant="outline">
                      <Plus aria-hidden="true" className="size-4" /> Add
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            aria-labelledby="clinic-profile-team-heading"
            className="scroll-mt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
            id="clinic-profile-team"
            ref={teamRef}
            tabIndex={-1}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
              <h2 className="text-xl font-bold text-[var(--secondary)]" id="clinic-profile-team-heading">
                Doctors and team
              </h2>
              <Button onClick={onOpenTeamDialog} variant="ghost">
                <UserPlus aria-hidden="true" className="size-4" /> Add team member
              </Button>
            </div>
            <div>
              {data.team.map((member) => (
                <div
                  className="flex items-center gap-4 border-b border-[var(--border)] p-5 last:border-0"
                  key={member.name}
                >
                  <AvatarInitials className="size-14" initials={member.initials} src={member.avatar} />
                  <div>
                    <strong>{member.name}</strong>
                    <p className="mt-1 text-sm text-[var(--foreground)]">{member.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
              <h2 className="text-xl font-bold text-[var(--secondary)]">Treatments and prices</h2>
              <Button onClick={onOpenTreatmentDialog} variant="ghost">
                <Plus aria-hidden="true" className="size-4" /> New treatment
              </Button>
            </div>
            <div className="p-5">
              <div className="hidden grid-cols-[1fr_7rem_7rem_2rem] gap-3 bg-[var(--surface)] px-4 py-3 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid">
                <span>Treatment</span>
                <span>Duration</span>
                <span>From</span>
                <span />
              </div>
              {data.treatments.map((treatment) => (
                <div
                  className="grid gap-2 border-b border-[var(--border)] px-1 py-4 last:border-0 sm:grid-cols-[1fr_7rem_7rem_2rem] sm:items-center sm:px-4"
                  key={treatment.name}
                >
                  <strong className="text-sm">{treatment.name}</strong>
                  <span className="text-sm text-[var(--foreground)]">{treatment.duration}</span>
                  <span className="font-bold text-[var(--primary)]">{treatment.price}</span>
                  <GripHorizontal aria-hidden="true" className="hidden size-4 sm:block" />
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <aside aria-label="Clinic profile details" className="space-y-6">
          <SurfaceCard className="p-5">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Address</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Street</dt>
                <dd className="mt-1">{data.address.street}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[var(--foreground)] uppercase">City</dt>
                <dd className="mt-1">{data.address.city}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Postal code</dt>
                <dd className="mt-1">{data.address.postalCode}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Phone</dt>
                <dd className="mt-1">{data.address.phone}</dd>
              </div>
            </dl>
            <div className="mt-5 flex h-40 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--foreground)]">
              <MapPin aria-hidden="true" className="mr-2 size-5" /> Map preview
            </div>
          </SurfaceCard>
          <SurfaceCard className="p-5">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Opening hours</h2>
            <dl className="mt-5 space-y-3">
              {data.openingHours.map((entry) => (
                <div className="flex justify-between gap-4 text-sm" key={entry.days}>
                  <dt className="text-[var(--foreground)]">{entry.days}</dt>
                  <dd className="font-bold">{entry.hours}</dd>
                </div>
              ))}
            </dl>
          </SurfaceCard>
        </aside>
      </div>
    </div>
  )
}
