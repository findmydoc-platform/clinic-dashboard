import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary",
    },
    variants: {
      size: {
        default: "h-10 px-4",
        icon: "size-10 p-0",
        large: "h-11 px-5",
      },
      variant: {
        primary:
          "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus-visible:outline-[var(--primary)]",
        secondary:
          "bg-[var(--secondary)] text-white hover:bg-[#110a69] focus-visible:outline-[var(--secondary)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--surface)] focus-visible:outline-[var(--primary)]",
        outline:
          "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface)] focus-visible:outline-[var(--primary)]",
      },
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button"

  return <Component className={cn(buttonVariants({ className, size, variant }))} {...props} />
}
