import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandMarkProps = Readonly<{
  className?: string
  priority?: boolean
}>

export function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <span aria-label="findmydoc" className={cn("inline-flex shrink-0 items-center", className)} role="img">
      <Image
        alt=""
        aria-hidden="true"
        className="h-auto w-[132px] dark:hidden"
        height={181}
        loading={priority ? "eager" : undefined}
        priority={priority}
        sizes="132px"
        src="/brand/findmydoc-logo-dark.svg"
        width={933}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="hidden h-auto w-[132px] dark:block"
        height={181}
        loading={priority ? "eager" : undefined}
        priority={priority}
        sizes="132px"
        src="/brand/findmydoc-logo-white.png"
        width={933}
      />
    </span>
  )
}
