"use client"

import { GripHorizontal, MapPin, Plus, UserPlus } from "lucide-react"
import { AvatarInitials, DemoPill, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { SurfaceCard } from "@/components/molecules/DashboardCards"
import { Button } from "@/components/ui/button"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"
import { getVisibilityBehavior, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"

export function ClinicProfileEditor({
  onOpenTeamDialog,
  onOpenTreatmentDialog,
  variant,
}: {
  onOpenTeamDialog: () => void
  onOpenTreatmentDialog: () => void
  variant: ClinicDashboardVariant
}) {
  const data = clinicDashboardFixture.profile
  const readOnly = getVisibilityBehavior(variant, "profileWrites") === "read-only"

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <WorkspaceHeading
          description={
            readOnly
              ? "Fixture-backed profile preview. Changes are not saved."
              : "Complete visual reference for clinic profile management."
          }
        >
          Clinic profile
        </WorkspaceHeading>
        <div className="flex items-center gap-2">
          <DemoPill>{readOnly ? "Read-only demo" : "Visual reference"}</DemoPill>
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
        className="grid h-72 grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-xl sm:h-96 sm:grid-cols-4"
      >
        <div className="col-span-2 row-span-2 bg-gradient-to-br from-[var(--accent)] via-white to-[var(--primary)]" />
        <div className="bg-gradient-to-br from-sky-100 to-blue-300" />
        <div className="bg-gradient-to-br from-slate-100 to-slate-300" />
        <div className="relative col-span-2 bg-gradient-to-br from-cyan-50 to-cyan-200">
          <span className="absolute right-3 bottom-3 rounded-full bg-white px-3 py-1 text-xs font-bold shadow">
            +12 more images
          </span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <SurfaceCard className="p-5 sm:p-6">
            <div className="grid gap-5">
              <label className="grid gap-2 text-xs font-bold tracking-wide text-[var(--muted-foreground)] uppercase">
                Clinic name
                <input
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-base font-bold text-[var(--foreground)] disabled:bg-[var(--surface)]"
                  defaultValue={data.name}
                  disabled={readOnly}
                />
              </label>
              <label className="grid gap-2 text-xs font-bold tracking-wide text-[var(--muted-foreground)] uppercase">
                Description
                <textarea
                  className="min-h-32 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm leading-6 text-[var(--foreground)] disabled:bg-[var(--surface)]"
                  defaultValue={data.description}
                  disabled={readOnly}
                />
              </label>
              <div>
                <div className="text-xs font-bold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Specialties
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.specialties.map((item) => (
                    <span
                      className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white"
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

          <SurfaceCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
              <h2 className="text-xl font-bold text-[var(--secondary)]">Doctors and team</h2>
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
                  <AvatarInitials className="size-14" initials={member.initials} />
                  <div>
                    <strong>{member.name}</strong>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{member.specialty}</p>
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
              <div className="hidden grid-cols-[1fr_7rem_7rem_2rem] gap-3 bg-[var(--surface)] px-4 py-3 text-xs font-bold tracking-wide text-[var(--muted-foreground)] uppercase sm:grid">
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
                  <span className="text-sm text-[var(--muted-foreground)]">{treatment.duration}</span>
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
                <dt className="text-xs font-bold text-[var(--muted-foreground)] uppercase">Street</dt>
                <dd className="mt-1">{data.address.street}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[var(--muted-foreground)] uppercase">City</dt>
                <dd className="mt-1">{data.address.city}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[var(--muted-foreground)] uppercase">Postal code</dt>
                <dd className="mt-1">{data.address.postalCode}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-bold text-[var(--muted-foreground)] uppercase">Phone</dt>
                <dd className="mt-1">{data.address.phone}</dd>
              </div>
            </dl>
            <div className="mt-5 flex h-40 items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted-foreground)]">
              <MapPin aria-hidden="true" className="mr-2 size-5" /> Map preview
            </div>
          </SurfaceCard>
          <SurfaceCard className="p-5">
            <h2 className="text-xl font-bold text-[var(--secondary)]">Opening hours</h2>
            <dl className="mt-5 space-y-3">
              {data.openingHours.map((entry) => (
                <div className="flex justify-between gap-4 text-sm" key={entry.days}>
                  <dt className="text-[var(--muted-foreground)]">{entry.days}</dt>
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
