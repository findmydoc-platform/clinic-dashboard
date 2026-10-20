import Image, { type ImageProps, type StaticImageData } from "next/image"
import { cn } from "@/lib/utils"

type AvatarProps = Readonly<{
  className?: string
  initials: string
  loading?: ImageProps["loading"]
  sizes?: ImageProps["sizes"]
  src?: StaticImageData | string
  unoptimized?: ImageProps["unoptimized"]
}>

export function Avatar({ className, initials, loading, sizes = "64px", src, unoptimized }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-bold text-[var(--secondary)]",
        className,
      )}
    >
      {src ? (
        <Image
          alt=""
          className="object-cover"
          fill
          loading={loading}
          sizes={sizes}
          src={src}
          unoptimized={unoptimized}
        />
      ) : (
        initials
      )}
    </span>
  )
}
