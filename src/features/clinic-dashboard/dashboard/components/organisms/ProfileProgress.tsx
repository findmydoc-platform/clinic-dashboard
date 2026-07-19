import { Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DashboardProfileTask } from "../../model/profile-tasks"

const taskPriorityStyles = {
  High: "bg-[var(--destructive)]",
  Low: "bg-[var(--accent)]",
  Medium: "bg-[var(--warning)]",
} as const

type ProfileProgressProps = Readonly<{
  completion: string
  onTaskOpen: (task: DashboardProfileTask) => void
  showCertificateTasks: boolean
  tasks: readonly DashboardProfileTask[]
}>

export function ProfileProgress({
  completion,
  onTaskOpen,
  showCertificateTasks,
  tasks,
}: ProfileProgressProps) {
  return (
    <Card className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]">Profile progress</h2>
        <strong className="text-[var(--primary)]">{completion}</strong>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              aria-label={`${task.label} profile task`}
              className="flex flex-col items-stretch gap-2 rounded-xl px-2 py-3 hover:bg-[var(--surface)] sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center 2xl:justify-between"
              key={task.id}
              role="group"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", taskPriorityStyles[task.priority])}
                />
                <div className="min-w-0">
                  <div className="text-sm leading-5 font-bold">{task.label}</div>
                  <div className="mt-0.5 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                    {task.priority} priority
                  </div>
                </div>
              </div>
              {task.visibility === "always" || showCertificateTasks ? (
                <Button
                  aria-label={
                    task.visibility === "full-interface" ? `${task.actionLabel} for ${task.label}` : undefined
                  }
                  className="shrink-0 self-start whitespace-nowrap sm:self-auto xl:self-start 2xl:self-auto"
                  onClick={() => onTaskOpen(task)}
                  size="small"
                  variant="ghost"
                >
                  {task.actionLabel}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-auto pt-4">
          <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--secondary)]">
              <Lightbulb aria-hidden="true" className="size-4 text-[var(--accent)]" /> Tip
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--foreground)]">
              Complete profiles receive more qualified inquiries.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
