import { Inbox } from "lucide-react"

type EmptyStateProps = Readonly<{
  description: string
  title: string
}>

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <div
      aria-label={title}
      className="flex flex-col items-center border border-dashed border-[var(--border)] bg-[var(--background)] px-6 py-10 text-center"
      role="status"
    >
      <div className="flex size-10 items-center justify-center bg-[var(--accent)] text-[var(--secondary)]">
        <Inbox aria-hidden="true" size={22} />
      </div>
      <h2 className="mt-5 text-lg font-bold text-[var(--secondary)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </div>
  )
}
