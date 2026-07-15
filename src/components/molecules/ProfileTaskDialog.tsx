"use client"

import { ArrowRight, CircleAlert } from "lucide-react"
import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import {
  hasProfileDestination,
  type ClinicProfileDestination,
  type DashboardProfileTask,
} from "@/lib/clinic-dashboard/profile-tasks"

type ProfileTaskDialogProps = Readonly<{
  onNavigate: (destination: ClinicProfileDestination) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  task: DashboardProfileTask
  triggerRef: RefObject<HTMLButtonElement | null>
}>

export function ProfileTaskDialog({
  onNavigate,
  onOpenChange,
  open,
  task,
  triggerRef,
}: ProfileTaskDialogProps) {
  const hasDestination = hasProfileDestination(task)

  return (
    <Modal
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
          {hasDestination ? (
            <Button onClick={() => onNavigate(task.destination)}>
              {task.destinationLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
        </div>
      }
      headerMeta={
        <span
          aria-label={`Status: Open, ${task.priority} priority`}
          className="text-right text-xs leading-5 font-bold text-[var(--foreground)]"
        >
          Open · {task.priority} priority
        </span>
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-md"
      title={task.label}
      triggerRef={triggerRef}
    >
      <div className="space-y-4">
        <div>
          <div className="text-xs font-bold tracking-wide text-[var(--foreground)] uppercase">
            What needs attention
          </div>
          <p className="mt-2 text-sm leading-6">{task.description}</p>
        </div>
        {hasDestination ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6">
            Review the existing clinic profile content. Opening the section does not change profile
            completion.
          </p>
        ) : (
          <div
            className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6"
            role="status"
          >
            <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
            <span>Certificate management is not available yet. This task cannot be completed here.</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
