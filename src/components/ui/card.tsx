import { forwardRef, type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"

export const Card = forwardRef<HTMLElement, ComponentPropsWithoutRef<"section">>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <section
      className={cn("rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm", className)}
      ref={ref}
      {...props}
    />
  )
})
