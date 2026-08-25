import { CheckCircle2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { DashboardProfileProgressState } from "../../model/profile-progress"
import type { DashboardProfileTask } from "../../model/profile-tasks"

type ProfileProgressProps = Readonly<{
  onRetry: () => void
  onTaskOpen: (task: DashboardProfileTask) => void
  progress: DashboardProfileProgressState
}>

export function ProfileProgress({ onRetry, onTaskOpen, progress }: ProfileProgressProps) {
  return (
    <Card className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] p-5">
        <h2 className="text-xl font-bold text-[var(--secondary)]">Public profile progress</h2>
        <strong className="shrink-0 text-[var(--primary)]">
          {progress.status === "ready" ? `${progress.percent}%` : "—"}
        </strong>
      </div>

      {progress.status === "loading" ? (
        <div aria-busy="true" className="flex flex-1 flex-col gap-4 p-5" role="status">
          <span className="sr-only">Loading public profile progress</span>
          <div className="h-3 animate-pulse rounded-full bg-[var(--surface)]" />
          <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
          <div className="h-14 animate-pulse rounded-xl bg-[var(--surface)]" />
        </div>
      ) : null}

      {progress.status === "error" ? (
        <div className="flex flex-1 flex-col justify-center p-5">
          <div
            className="rounded-xl border border-[var(--error)] bg-[color-mix(in_srgb,var(--error)_28%,var(--background))] p-4"
            role="alert"
          >
            <h3 className="font-bold text-[var(--secondary)]">Profile progress unavailable</h3>
            <p className="mt-2 text-sm leading-6">{progress.message}</p>
            <Button className="mt-4" onClick={onRetry} variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" /> Retry
            </Button>
          </div>
        </div>
      ) : null}

      {progress.status === "ready" ? (
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div
            aria-label={`Public profile progress: ${progress.percent}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="h-2 overflow-hidden rounded-full bg-[var(--surface)]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            {progress.completedAreaCount} of {progress.totalAreaCount} profile areas complete
          </p>

          {progress.percent === 100 ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--secondary)]" />
              <div>
                <h3 className="font-bold text-[var(--secondary)]">Your public profile is complete</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
                  Published profile information meets all 6 completion criteria.
                </p>
              </div>
            </div>
          ) : null}

          {progress.tasks.length > 0 ? (
            <ul aria-label="Profile tasks" className="mt-4 space-y-2">
              {progress.tasks.map((task) => (
                <li
                  className="flex min-w-0 flex-col items-stretch gap-2 rounded-xl border border-transparent p-3 hover:border-[var(--border)] hover:bg-[var(--surface)] sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center"
                  key={task.id}
                >
                  <div className="min-w-0">
                    <div className="text-sm leading-5 font-bold">{task.label}</div>
                    <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">{task.description}</p>
                  </div>
                  <Button
                    aria-label={`${task.actionLabel} for ${task.label}`}
                    className="shrink-0 self-start whitespace-nowrap sm:self-auto xl:self-start 2xl:self-auto"
                    onClick={() => onTaskOpen(task)}
                    variant="ghost"
                  >
                    {task.actionLabel}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
