import { forwardRef, type ChangeEvent, type SelectHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> &
  Readonly<{
    onValueChange?: (value: string) => void
  }>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, onValueChange, ...props },
  ref,
) {
  const handleChange = onValueChange
    ? (event: ChangeEvent<HTMLSelectElement>) => onValueChange(event.currentTarget.value)
    : undefined

  return (
    <select
      className={cn(
        "min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base text-[var(--foreground)] outline-offset-2 transition-colors focus-visible:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-70 aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:focus-visible:border-[var(--destructive)] aria-[invalid=true]:focus-visible:outline-[var(--destructive)]",
        className,
      )}
      onChange={handleChange}
      ref={ref}
      {...props}
    />
  )
})
