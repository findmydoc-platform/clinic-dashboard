import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "h-11 px-4",
        icon: "size-11 p-0",
        large: "h-11 px-5",
        small: "min-h-10 px-3 text-xs",
      },
      variant: {
        accent:
          "bg-[var(--accent)] text-[var(--accent-foreground)] enabled:hover:bg-[color-mix(in_srgb,var(--accent)_86%,var(--secondary))] focus-visible:outline-[var(--primary)]",
        primary:
          "bg-[var(--primary)] text-[var(--on-primary)] enabled:hover:bg-[var(--primary-hover)] focus-visible:outline-[var(--primary)]",
        secondary:
          "bg-[var(--background)] text-[var(--primary)] enabled:hover:bg-[var(--surface)] focus-visible:outline-[var(--primary)]",
        ghost:
          "bg-transparent text-[var(--foreground)] enabled:hover:bg-[var(--surface)] focus-visible:outline-[var(--primary)]",
        outline:
          "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] enabled:hover:bg-[var(--surface)] focus-visible:outline-[var(--primary)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] enabled:hover:opacity-90 focus-visible:outline-[var(--destructive)]",
      },
    },
  },
)

export type ButtonProps = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { asChild = false, className, size, type = "button", variant, ...props },
  ref,
) {
  const Component = asChild ? Slot : "button"

  return (
    <Component
      className={cn(buttonVariants({ className, size, variant }))}
      ref={ref}
      {...(asChild ? {} : { type })}
      {...props}
    />
  )
})
