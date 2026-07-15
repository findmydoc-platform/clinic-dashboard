import Image from "next/image"
import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  priority?: boolean
}

export function BrandMark({ className, priority = false }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        alt="findmydoc"
        className="h-auto w-[132px] dark:hidden"
        height={181}
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
        priority={priority}
        sizes="132px"
        src="/brand/findmydoc-logo-white.png"
        width={933}
      />
    </span>
  )
}
