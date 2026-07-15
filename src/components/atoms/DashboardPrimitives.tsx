import Image, { type StaticImageData } from "next/image"
import type { ReactNode } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function AvatarInitials({
  initials,
  className,
  src,
}: {
  initials: string
  className?: string
  src?: StaticImageData | string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--secondary)]",
        className,
      )}
    >
      {src ? <Image alt="" className="object-cover" fill sizes="64px" src={src} /> : initials}
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
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground)]">{description}</p>
      ) : null}
    </div>
  )
}
