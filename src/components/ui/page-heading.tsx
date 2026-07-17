import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageHeadingProps = Readonly<
  Omit<ComponentPropsWithoutRef<"h1">, "children"> & {
    children: ReactNode
    description?: ReactNode
  }
>

export const PageHeading = forwardRef<HTMLHeadingElement, PageHeadingProps>(function PageHeading(
  { children, className, description, ...headingProps },
  ref,
) {
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
})
