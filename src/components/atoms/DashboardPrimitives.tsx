import Image, { type StaticImageData } from "next/image"
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { Star, StarHalf } from "lucide-react"
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
  const roundedValue = Math.round(value * 2) / 2

  return (
    <span
      aria-label={`${value} out of 5 stars`}
      className={cn("inline-flex gap-0.5 text-[var(--primary)]", className)}
      role="img"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const state = index + 1 <= roundedValue ? "full" : index + 0.5 <= roundedValue ? "half" : "empty"
        const Icon = state === "half" ? StarHalf : Star

        return (
          <Icon
            aria-hidden="true"
            className={cn("size-4", state !== "empty" && "fill-current")}
            data-star-state={state}
            key={index}
          />
        )
      })}
    </span>
  )
}

type WorkspaceHeadingProps = Omit<ComponentPropsWithoutRef<"h1">, "children"> & {
  children: ReactNode
  description?: ReactNode
}

export const WorkspaceHeading = forwardRef<HTMLHeadingElement, WorkspaceHeadingProps>(
  function WorkspaceHeading({ children, className, description, ...headingProps }, ref) {
    return (
      <div>
        <h1
          className={cn("text-3xl font-bold tracking-tight text-[var(--secondary)] sm:text-4xl", className)}
          ref={ref}
          {...headingProps}
        >
          {children}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground)]">{description}</p>
        ) : null}
      </div>
    )
  },
)
