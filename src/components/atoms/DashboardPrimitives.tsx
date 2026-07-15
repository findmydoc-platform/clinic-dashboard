import type { ReactNode } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function AvatarInitials({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--secondary)]",
        className,
      )}
    >
      {initials}
    </span>
  )
}

export function DemoPill({ children = "Demo data" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_24%,white)] px-3 text-xs font-bold text-[var(--secondary)]">
      {children}
    </span>
  )
}

export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      aria-label={`${value} out of 5 stars`}
      className={cn("inline-flex gap-0.5 text-[var(--primary)]", className)}
      role="img"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star aria-hidden="true" className="size-4 fill-current" key={index} />
      ))}
    </span>
  )
}

export function WorkspaceHeading({
  children,
  description,
}: {
  children: ReactNode
  description?: ReactNode
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-[var(--secondary)] sm:text-4xl">{children}</h1>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      ) : null}
    </div>
  )
}
