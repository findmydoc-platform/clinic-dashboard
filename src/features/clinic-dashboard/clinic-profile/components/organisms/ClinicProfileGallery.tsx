import Image from "next/image"
import { forwardRef } from "react"
import { ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import { cn } from "@/lib/utils"
import type { ClinicGalleryLoadStatus } from "../../model/clinic-gallery"
import type { ClinicGalleryItem } from "../../model/clinic-profile"

type ClinicProfileGalleryProps = Readonly<{
  gallery: readonly ClinicGalleryItem[]
  galleryTotal: number
  onOpen: () => void
  showAction?: boolean
  status?: ClinicGalleryLoadStatus
}>

function secondaryGridClasses(count: number) {
  if (count === 1) return "grid-cols-1 sm:grid-cols-1 sm:grid-rows-1"
  if (count === 2) return "grid-cols-2 sm:grid-cols-1 sm:grid-rows-2"
  if (count === 3) return "grid-cols-3 sm:grid-cols-2 sm:grid-rows-2"
  return "grid-cols-4 sm:grid-cols-2 sm:grid-rows-2"
}

function galleryGridClasses(count: number) {
  if (count === 1) return ""
  if (count === 4) return "sm:grid-cols-[minmax(0,5fr)_minmax(15rem,3fr)]"
  if (count >= 5) return "sm:grid-cols-2"
  return "sm:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]"
}

export const ClinicProfileGallery = forwardRef<HTMLElement, ClinicProfileGalleryProps>(
  function ClinicProfileGallery({ gallery, galleryTotal, onOpen, showAction = true, status = "ready" }, ref) {
    const cover = gallery.find((item) => item.isCover) ?? gallery[0]
    const orderedGallery = cover
      ? [cover, ...gallery.filter((item) => item.id !== cover.id)].slice(0, 5)
      : gallery.slice(0, 5)
    const secondaryImages = orderedGallery.slice(1)

    if (status === "forbidden") return null

    if (status === "temporarily-unavailable") {
      return (
        <section
          aria-label="Clinic image gallery"
          className="grid min-h-48 scroll-mt-6 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          id="clinic-profile-gallery"
          ref={ref}
          role="alert"
          tabIndex={-1}
        >
          <div>
            <p className="font-bold text-[var(--secondary)]">Gallery unavailable</p>
            <p className="mt-2 text-sm text-[var(--foreground)]">
              Your public gallery could not be loaded. No demo images are shown in its place.
            </p>
            {showAction ? (
              <Button className="mt-4" onClick={onOpen} variant="outline">
                Try again
              </Button>
            ) : null}
          </div>
        </section>
      )
    }

    if (orderedGallery.length === 0) {
      return (
        <section
          aria-label="Clinic image gallery"
          className="grid min-h-48 scroll-mt-6 place-items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]"
          id="clinic-profile-gallery"
          ref={ref}
          tabIndex={-1}
        >
          <div>
            <ImageIcon aria-hidden="true" className="mx-auto size-7 text-[var(--primary)]" />
            <p className="mt-3 font-bold text-[var(--secondary)]">No gallery images yet</p>
            {showAction ? (
              <Button className="mt-4" onClick={onOpen} variant="outline">
                <ImageIcon aria-hidden="true" className="size-4" /> Manage gallery
              </Button>
            ) : null}
          </div>
        </section>
      )
    }

    return (
      <section
        aria-label="Clinic image gallery"
        className={cn(
          "grid w-full scroll-mt-6 gap-2 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)]",
          orderedGallery.length === 1 ? "h-64 sm:h-72" : "sm:h-72 sm:grid-rows-1",
          galleryGridClasses(orderedGallery.length),
        )}
        id="clinic-profile-gallery"
        ref={ref}
        tabIndex={-1}
      >
        <div
          className={cn(
            "relative min-h-0 overflow-hidden rounded-xl",
            orderedGallery.length === 1 ? "h-full" : "aspect-[16/10] sm:aspect-auto sm:h-full",
          )}
        >
          <Image
            alt={orderedGallery[0]?.alt ?? "Clinic main image"}
            className="object-cover"
            fill
            preload
            sizes={orderedGallery.length === 1 ? "100vw" : "(min-width: 768px) 65vw, 100vw"}
            src={orderedGallery[0]!.src}
            unoptimized={isClinicGalleryImageProxyUrl(orderedGallery[0]!.src)}
          />
          <span className="absolute bottom-3 left-3 rounded-md bg-[rgb(0_0_0_/_0.72)] px-2 py-1 text-xs font-bold text-white">
            Main image
          </span>
          {showAction ? (
            <Button
              className="absolute right-3 bottom-3 min-h-9 bg-[var(--background)] px-3 py-1 text-xs shadow"
              onClick={onOpen}
              size="small"
              variant="secondary"
            >
              <ImageIcon aria-hidden="true" className="size-4" /> Manage gallery
            </Button>
          ) : null}
        </div>

        {secondaryImages.length > 0 ? (
          <div className={cn("grid h-20 gap-2 sm:h-full", secondaryGridClasses(secondaryImages.length))}>
            {secondaryImages.map((item, index) => (
              <div
                className={cn(
                  "relative min-h-0 overflow-hidden rounded-lg",
                  secondaryImages.length === 3 && index === 0 && "sm:col-span-2",
                )}
                key={item.id}
              >
                <Image
                  alt={item.alt}
                  className="object-cover"
                  fill
                  loading="eager"
                  sizes="(min-width: 768px) 25vw, 25vw"
                  src={item.src}
                  unoptimized={isClinicGalleryImageProxyUrl(item.src)}
                />
                {galleryTotal > orderedGallery.length && index === secondaryImages.length - 1 ? (
                  <span className="absolute inset-0 grid place-items-center bg-[rgb(0_0_0_/_0.48)] text-sm font-bold text-white">
                    +{galleryTotal - orderedGallery.length} more
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    )
  },
)
