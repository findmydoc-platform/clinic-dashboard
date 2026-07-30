"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InlineTextDiff } from "@/components/ui/inline-text-diff"
import { Modal } from "@/components/ui/modal"
import type {
  ClinicProfileChange,
  ClinicProfileChangeSet,
  ClinicProfileValidationErrors,
} from "../../model/clinic-profile-editing"

type PublishReviewDialogProps = Readonly<{
  changeSet: ClinicProfileChangeSet
  errors: ClinicProfileValidationErrors
  isPublishing: boolean
  isResolvingOutcome: boolean
  onBack: () => void
  onPublish: () => void
  onResolveOutcome: () => void
  open: boolean
  outcomeUnresolved: boolean
  statusMessage: string
}>

const sectionLabels = {
  address: "Address",
  hours: "Opening hours",
  profile: "Profile basics",
} as const

function StructuredDiff({ change }: Readonly<{ change: ClinicProfileChange }>) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <del className="rounded-sm bg-[var(--surface)] px-0.5 text-[color-mix(in_srgb,var(--foreground)_52%,var(--muted-foreground))] decoration-2">
        <span className="sr-only">Removed: </span>
        {change.before || "Not provided"}
      </del>
      <ins className="rounded-sm bg-[var(--accent-soft)] px-0.5 font-bold text-[color-mix(in_srgb,var(--accent)_48%,var(--secondary))] underline decoration-2 underline-offset-4">
        <span className="sr-only">Added: </span>
        {change.after || "Not provided"}
      </ins>
    </div>
  )
}

export function PublishReviewDialog({
  changeSet,
  errors,
  isPublishing,
  isResolvingOutcome,
  onBack,
  onPublish,
  onResolveOutcome,
  open,
  outcomeUnresolved,
  statusMessage,
}: PublishReviewDialogProps) {
  const hasErrors = Object.keys(errors).length > 0
  const sections = (["profile", "address", "hours"] as const)
    .map((section) => ({
      changes: changeSet.changes.filter((change) => change.section === section),
      id: section,
    }))
    .filter((section) => section.changes.length > 0)

  return (
    <Modal
      description="Review the changes that will replace the currently published clinic profile."
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-[var(--foreground)]">
            <Info aria-hidden="true" className="size-4" />
            Changes will be public immediately.
          </p>
          <div className="flex justify-end gap-2">
            {outcomeUnresolved ? (
              <Button disabled={isResolvingOutcome} onClick={onResolveOutcome} variant="outline">
                {isResolvingOutcome ? "Reloading…" : "Reload status"}
              </Button>
            ) : null}
            <Button
              disabled={isPublishing || isResolvingOutcome || outcomeUnresolved}
              onClick={onBack}
              variant="outline"
            >
              Back to editing
            </Button>
            <Button
              disabled={hasErrors || isPublishing || isResolvingOutcome || outcomeUnresolved}
              onClick={onPublish}
            >
              {isPublishing ? "Publishing…" : "Publish changes"}
            </Button>
          </div>
        </div>
      }
      footerClassName="bg-[var(--background)]"
      headerMeta={
        <span className="text-sm text-[var(--foreground)]">
          {changeSet.fieldCount} changed {changeSet.fieldCount === 1 ? "field" : "fields"} across{" "}
          {changeSet.sectionCount} {changeSet.sectionCount === 1 ? "section" : "sections"}
        </span>
      }
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPublishing && !isResolvingOutcome && !outcomeUnresolved) onBack()
      }}
      open={open}
      panelClassName="max-w-3xl"
      title="Review and publish"
    >
      {statusMessage ? (
        <p
          className="mb-5 rounded-lg border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_25%,var(--background))] p-3 text-sm"
          role="alert"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="divide-y divide-[var(--border)]">
        {sections.map((section) => (
          <section className="py-5 first:pt-0 last:pb-0" key={section.id}>
            <h3 className="text-lg font-bold text-[var(--secondary)]">{sectionLabels[section.id]}</h3>
            <dl className="mt-4 grid gap-4">
              {section.changes.map((change) => (
                <div className="grid gap-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]" key={change.field}>
                  <dt className="text-[var(--foreground)]">{change.label}</dt>
                  <dd className="min-w-0 leading-6">
                    {change.kind === "text" ? (
                      <InlineTextDiff after={change.after} before={change.before} />
                    ) : (
                      <StructuredDiff change={change} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
