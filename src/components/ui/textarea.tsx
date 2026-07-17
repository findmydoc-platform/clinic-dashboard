import { forwardRef, type ChangeEvent, type TextareaHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type TextareaProps = Readonly<
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
    onValueChange?: (value: string) => void
  }
>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, onValueChange, ...props },
  ref,
) {
  const handleChange = onValueChange
    ? (event: ChangeEvent<HTMLTextAreaElement>) => onValueChange(event.currentTarget.value)
    : undefined

  return (
    <textarea
      className={cn(
        "min-h-28 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base text-[var(--foreground)] outline-offset-2 transition-colors placeholder:text-[var(--muted-foreground)] read-only:bg-[var(--surface)] focus-visible:border-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:opacity-70 aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:focus-visible:border-[var(--destructive)] aria-[invalid=true]:focus-visible:outline-[var(--destructive)]",
        className,
      )}
      onChange={handleChange}
      ref={ref}
      {...props}
    />
  )
})
