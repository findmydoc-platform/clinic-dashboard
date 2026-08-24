"use client"

import { ArrowRight, CircleAlert, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { ClinicProfileFocusTarget } from "@/features/clinic-dashboard/clinic-profile/public"
import type { DashboardProfileTask } from "../../model/profile-tasks"

type ProfileTaskDialogProps = Readonly<{
  onOpenChange: (open: boolean) => void
  onProfileDestinationOpen: (destination: ClinicProfileFocusTarget) => void
  open: boolean
  task: DashboardProfileTask
}>

function DetailHeading({ children }: Readonly<{ children: string }>) {
  return <h3 className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">{children}</h3>
}

function ItemList({ items }: Readonly<{ items: readonly string[] }>) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function ProfileTaskDialog({
  onOpenChange,
  onProfileDestinationOpen,
  open,
  task,
}: ProfileTaskDialogProps) {
  return (
    <Modal
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
          <Button onClick={() => onProfileDestinationOpen(task.destination)}>
            {task.destinationLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-lg"
      title={task.label}
    >
      <div className="space-y-5">
        {task.kind === "category" ? (
          <>
            <section>
              <DetailHeading>Why this matters</DetailHeading>
              <p className="mt-2 text-sm leading-6">{task.benefit}</p>
              {task.guidance ? (
                <aside
                  aria-label="Profile task guidance"
                  className="mt-3 flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6"
                >
                  <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
                  <span>{task.guidance}</span>
                </aside>
              ) : null}
            </section>
            <section>
              <DetailHeading>What is missing</DetailHeading>
              <ItemList items={task.missingItems} />
            </section>
            <section>
              <DetailHeading>Complete when</DetailHeading>
              <p className="mt-2 text-sm leading-6">{task.completionCriteria}</p>
            </section>
          </>
        ) : null}

        {task.kind === "complete-draft" ? (
          <>
            <section>
              <DetailHeading>Draft status</DetailHeading>
              <p className="mt-2 text-sm leading-6">{task.description}</p>
              <p className="mt-2 text-xs text-[var(--foreground)]">
                {task.completedAreaCount} of {task.totalAreaCount} profile areas complete
              </p>
            </section>
            <section>
              <DetailHeading>Still needs attention</DetailHeading>
              <ItemList items={task.missingItems} />
            </section>
            <section>
              <DetailHeading>Complete when</DetailHeading>
              <p className="mt-2 text-sm leading-6">{task.completionCriteria}</p>
            </section>
          </>
        ) : null}

        {task.kind === "publish-draft" ? (
          <>
            <section>
              <DetailHeading>Ready to publish</DetailHeading>
              <p className="mt-2 text-sm leading-6">{task.description}</p>
              <ItemList items={task.changedItems} />
            </section>
            <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
              Review the changes before publishing. Opening the review does not publish them.
            </p>
          </>
        ) : null}

        {task.kind === "review-draft" ? (
          <div
            className="flex items-start gap-3 rounded-lg border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_32%,var(--background))] p-4 text-sm leading-6"
            role="status"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--secondary)]" />
            <span>{task.description}</span>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
