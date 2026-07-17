import Image, { type ImageProps, type StaticImageData } from "next/image"
import { cn } from "@/lib/utils"

type AvatarProps = Readonly<{
  className?: string
  initials: string
  loading?: ImageProps["loading"]
  src?: StaticImageData | string
}>

export function Avatar({ className, initials, loading, src }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--secondary)]",
        className,
      )}
    >
      {src ? (
        <Image alt="" className="object-cover" fill loading={loading} sizes="64px" src={src} />
      ) : (
        initials
      )}
    </span>
  )
}
