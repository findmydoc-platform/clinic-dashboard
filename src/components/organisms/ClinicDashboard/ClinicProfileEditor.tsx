"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef } from "react"
import { ArrowDown, ArrowUp, ImageIcon, MapPin, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react"
import { AvatarInitials, WorkspaceHeading } from "@/components/atoms/DashboardPrimitives"
import { SurfaceCard } from "@/components/molecules/DashboardCards"
import { Button } from "@/components/ui/button"
import type { ClinicProfileDraft, ClinicTeamMember, ClinicTreatment } from "@/lib/clinic-dashboard/profile"
import type { ClinicProfileDestination } from "@/lib/clinic-dashboard/profile-tasks"
import { getVisibilityBehavior, type ClinicDashboardVariant } from "@/lib/clinic-dashboard/visibility"

export function ClinicProfileEditor({
  data,
  dirty,
  focusTarget,
  onCancel,
  onChange,
  onEditAddress,
  onEditHours,
  onEditTeamMember,
  onEditTreatment,
  onFocusTargetHandled,
  onMoveTreatment,
  onOpenGallery,
  onOpenSpecialtyDialog,
  onOpenTeamDialog,
  onOpenTreatmentDialog,
  onRemoveTeamMember,
  onRemoveTreatment,
  onSave,
  onUndo,
  saveState,
  statusMessage,
  undoKind,
  undoMessage,
  variant,
}: {
  data: ClinicProfileDraft
  dirty: boolean
  focusTarget?: ClinicProfileDestination
  onCancel: () => void
  onChange: (profile: ClinicProfileDraft) => void
  onEditAddress: () => void
  onEditHours: () => void
  onEditTeamMember: (member: ClinicTeamMember) => void
  onEditTreatment: (treatment: ClinicTreatment) => void
  onFocusTargetHandled: () => void
  onMoveTreatment: (id: string, direction: -1 | 1) => void
  onOpenGallery: () => void
  onOpenSpecialtyDialog: () => void
  onOpenTeamDialog: () => void
  onOpenTreatmentDialog: () => void
  onRemoveTeamMember: (id: string) => void
  onRemoveTreatment: (id: string) => void
  onSave: () => void
  onUndo: () => void
  saveState: "idle" | "saved" | "saving"
  statusMessage: string
  undoKind?: "team" | "treatment"
  undoMessage?: string
  variant: ClinicDashboardVariant
}) {
  const readOnly = getVisibilityBehavior(variant, "profileWrites") === "read-only"
  const busy = saveState === "saving"
  const interactionDisabled = readOnly || busy
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

  const gallery = useMemo(() => {
    const cover = data.gallery.find((item) => item.isCover) ?? data.gallery[0]
    return cover ? [cover, ...data.gallery.filter((item) => item.id !== cover.id)] : data.gallery
  }, [data.gallery])

  const saveControls = (
    <>
      <Button disabled={!dirty || busy} onClick={onCancel} variant="outline">
        Cancel
      </Button>
      <Button disabled={!dirty || busy} onClick={onSave} variant={dirty ? "primary" : "outline"}>
        {saveState === "saving" ? "Saving…" : "Save changes"}
      </Button>
    </>
  )
  const undoPanel = undoMessage ? (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_6%,var(--background))] px-5 py-3 text-sm"
      role="status"
    >
      <span className="font-bold text-[var(--secondary)]">{undoMessage}</span>
      <Button disabled={busy} onClick={onUndo} size="small" variant="outline">
        Undo removal
      </Button>
    </div>
  ) : null

  return (
    <div aria-busy={busy} className="space-y-6 pb-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm text-[var(--foreground)]">Clinics / Edit profile</p>
          <WorkspaceHeading>Clinic profile</WorkspaceHeading>
        </div>
        {!readOnly ? (
          <div aria-label="Profile page actions" className="flex items-center gap-2" role="group">
            {saveControls}
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-[var(--foreground)]" role="status">
        {statusMessage}
      </p>
      <section
        aria-label="Clinic image gallery"
        className="grid h-72 scroll-mt-6 grid-cols-2 grid-rows-4 gap-2 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:h-56 sm:grid-cols-4 sm:grid-rows-2"
        id="clinic-profile-gallery"
        ref={galleryRef}
        tabIndex={-1}
      >
        {gallery.map((item, index) => (
          <div
            className={
              index === 0
                ? "relative col-span-2 row-span-2"
                : index === 3
                  ? "relative col-span-2"
                  : "relative"
            }
            key={item.id}
          >
            <Image
              alt={item.alt}
              className="object-cover"
              fill
              priority={index === 0}
              sizes={
                index === 0 || index === 3
                  ? "(min-width: 768px) 50vw, 100vw"
                  : "(min-width: 768px) 25vw, 50vw"
              }
              src={item.src}
            />
            {index === 3 ? (
              <Button
                className="absolute right-3 bottom-3 min-h-9 bg-[var(--background)] px-3 py-1 text-xs shadow"
                disabled={interactionDisabled}
                onClick={onOpenGallery}
                size="small"
                variant="secondary"
              >
                <ImageIcon aria-hidden="true" className="size-4" /> +{Math.max(0, data.galleryTotal - 4)} more
                images
              </Button>
            ) : null}
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-6">
          <SurfaceCard className="p-5 sm:p-6">
            <div className="grid gap-5">
              <label className="grid gap-2 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                Clinic name
                <input
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-base font-bold text-[var(--foreground)] disabled:bg-[var(--surface)]"
                  disabled={interactionDisabled}
                  onChange={(event) => onChange({ ...data, name: event.target.value })}
                  value={data.name}
                />
              </label>
              <label className="grid gap-2 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                Description
                <textarea
                  className="min-h-32 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm leading-6 text-[var(--foreground)] disabled:bg-[var(--surface)]"
                  disabled={interactionDisabled}
                  onChange={(event) => onChange({ ...data, description: event.target.value })}
                  value={data.description}
                />
              </label>
              <div>
                <div className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
                  Specialties
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.specialties.map((item) => (
                    <span
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-[var(--on-primary)]"
                      key={item}
                    >
                      {item}
                      {!readOnly ? (
                        <button
                          aria-label={`Remove ${item} specialty`}
                          className="rounded-full p-1 focus-visible:outline-2 focus-visible:outline-offset-2"
                          disabled={busy}
                          onClick={() =>
                            onChange({
                              ...data,
                              specialties: data.specialties.filter((specialty) => specialty !== item),
                            })
                          }
                          type="button"
                        >
                          <X aria-hidden="true" className="size-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                  {!readOnly ? (
                    <Button disabled={busy} onClick={onOpenSpecialtyDialog} size="small" variant="outline">
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
              <Button disabled={busy} onClick={onOpenTeamDialog} variant="ghost">
                <UserPlus aria-hidden="true" className="size-4" /> Add team member
              </Button>
            </div>
            {undoKind === "team" ? undoPanel : null}
            <div>
              {data.team.map((member) => (
                <div
                  className="flex items-center gap-4 border-b border-[var(--border)] p-5 last:border-0"
                  key={member.id}
                >
                  <AvatarInitials className="size-14" initials={member.initials} src={member.avatar} />
                  <div className="min-w-0 flex-1">
                    <strong>{member.name}</strong>
                    <p className="mt-1 text-sm text-[var(--foreground)]">{member.specialty}</p>
                  </div>
                  {!readOnly ? (
                    <div
                      aria-label={`Actions for ${member.name}`}
                      className="flex justify-end gap-1"
                      role="group"
                    >
                      <Button
                        aria-label={`Edit ${member.name}`}
                        disabled={busy}
                        onClick={() => onEditTeamMember(member)}
                        size="icon"
                        title={`Edit ${member.name}`}
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        aria-label={`Remove ${member.name}`}
                        className="text-[var(--destructive)] enabled:hover:bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))] enabled:hover:text-[var(--destructive)]"
                        disabled={busy}
                        onClick={() => onRemoveTeamMember(member.id)}
                        size="icon"
                        title={`Remove ${member.name}`}
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
              <h2 className="text-xl font-bold text-[var(--secondary)]">Treatments and prices</h2>
              <Button disabled={busy} onClick={onOpenTreatmentDialog} variant="ghost">
                <Plus aria-hidden="true" className="size-4" /> New treatment
              </Button>
            </div>
            {undoKind === "treatment" ? undoPanel : null}
            <div className="p-5">
              <div className="hidden grid-cols-[minmax(8rem,1fr)_5rem_5rem_12rem] gap-3 bg-[var(--surface)] px-4 py-3 text-xs font-bold tracking-wide text-[var(--foreground)] uppercase sm:grid">
                <span>Treatment</span>
                <span>Duration</span>
                <span>From</span>
                <span>Actions</span>
              </div>
              {data.treatments.map((treatment, index) => (
                <div
                  className="grid gap-2 border-b border-[var(--border)] px-1 py-4 last:border-0 sm:grid-cols-[minmax(8rem,1fr)_5rem_5rem_12rem] sm:items-center sm:px-4"
                  key={treatment.id}
                >
                  <strong className="text-sm">{treatment.name}</strong>
                  <span className="text-sm text-[var(--foreground)]">{treatment.duration}</span>
                  <span className="font-bold text-[var(--primary)]">{treatment.price}</span>
                  {!readOnly ? (
                    <div
                      aria-label={`Actions for ${treatment.name}`}
                      className="flex flex-nowrap items-center gap-1"
                      role="group"
                    >
                      <div aria-label={`Reorder ${treatment.name}`} className="flex gap-1" role="group">
                        <Button
                          aria-label={`Move ${treatment.name} up`}
                          disabled={busy || index === 0}
                          onClick={() => onMoveTreatment(treatment.id, -1)}
                          size="icon"
                          title={`Move ${treatment.name} up`}
                          variant="ghost"
                        >
                          <ArrowUp aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Move ${treatment.name} down`}
                          disabled={busy || index === data.treatments.length - 1}
                          onClick={() => onMoveTreatment(treatment.id, 1)}
                          size="icon"
                          title={`Move ${treatment.name} down`}
                          variant="ghost"
                        >
                          <ArrowDown aria-hidden="true" className="size-4" />
                        </Button>
                      </div>
                      <Button
                        aria-label={`Edit ${treatment.name}`}
                        disabled={busy}
                        onClick={() => onEditTreatment(treatment)}
                        size="icon"
                        title={`Edit ${treatment.name}`}
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        aria-label={`Remove ${treatment.name}`}
                        className="text-[var(--destructive)] enabled:hover:bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))] enabled:hover:text-[var(--destructive)]"
                        disabled={busy}
                        onClick={() => onRemoveTreatment(treatment.id)}
                        size="icon"
                        title={`Remove ${treatment.name}`}
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <aside aria-label="Clinic profile details" className="space-y-6">
          <SurfaceCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[var(--secondary)]">Address</h2>
              {!readOnly ? (
                <Button disabled={busy} onClick={onEditAddress} size="small" variant="ghost">
                  <Pencil aria-hidden="true" className="size-4" /> Edit
                </Button>
              ) : null}
            </div>
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
            <button
              className="mt-5 flex h-40 w-full items-center justify-center rounded-lg bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              disabled={interactionDisabled}
              onClick={interactionDisabled ? undefined : onEditAddress}
              type="button"
            >
              <MapPin aria-hidden="true" className="mr-2 size-5" /> Adjust map and address
            </button>
          </SurfaceCard>
          <SurfaceCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[var(--secondary)]">Opening hours</h2>
              {!readOnly ? (
                <Button disabled={busy} onClick={onEditHours} size="small" variant="ghost">
                  <Pencil aria-hidden="true" className="size-4" /> Edit
                </Button>
              ) : null}
            </div>
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

      {!readOnly && dirty ? (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] px-4 py-3 shadow-2xl backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-[100rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-bold text-[var(--secondary)]">Unsaved fixture profile changes</span>
            <div aria-label="Sticky profile actions" className="flex justify-end gap-2" role="group">
              {saveControls}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
