import Image from "next/image"
import { forwardRef } from "react"
import { ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import type { ClinicGalleryLoadStatus } from "../../model/clinic-gallery"
import type { ClinicGalleryItem } from "../../model/clinic-profile"

type ClinicProfileGalleryProps = Readonly<{
  gallery: readonly ClinicGalleryItem[]
  galleryTotal: number
  onOpen: () => void
  status?: ClinicGalleryLoadStatus
}>

export const ClinicProfileGallery = forwardRef<HTMLElement, ClinicProfileGalleryProps>(
  function ClinicProfileGallery({ gallery, galleryTotal, onOpen, status = "ready" }, ref) {
    const cover = gallery.find((item) => item.isCover) ?? gallery[0]
    const orderedGallery = cover ? [cover, ...gallery.filter((item) => item.id !== cover.id)] : gallery

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
            <Button className="mt-4" onClick={onOpen} variant="outline">
              Try again
            </Button>
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
            <Button className="mt-4" onClick={onOpen} variant="outline">
              <ImageIcon aria-hidden="true" className="size-4" /> Open gallery
            </Button>
          </div>
        </section>
      )
    }

    return (
      <section
        aria-label="Clinic image gallery"
        className="grid h-72 scroll-mt-6 grid-cols-2 grid-rows-4 gap-2 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--primary)] sm:h-56 sm:grid-cols-4 sm:grid-rows-2"
        id="clinic-profile-gallery"
        ref={ref}
        tabIndex={-1}
      >
        {orderedGallery.map((item, index) => (
          <div
            className={
              index === 0
                ? "relative col-span-2 row-span-2"
                : index === 3
                  ? "relative col-span-2"
                  : "relative"
            }
            key={item.id}
          >
            <Image
              alt={item.alt}
              className="object-cover"
              fill
              loading={index === 0 ? undefined : "eager"}
              preload={index === 0}
              sizes={
                index === 0 || index === 3
                  ? "(min-width: 768px) 50vw, 100vw"
                  : "(min-width: 768px) 25vw, 50vw"
              }
              src={item.src}
              unoptimized={isClinicGalleryImageProxyUrl(item.src)}
            />
            {index === orderedGallery.length - 1 ? (
              <Button
                className="absolute right-3 bottom-3 min-h-9 bg-[var(--background)] px-3 py-1 text-xs shadow"
                onClick={onOpen}
                size="small"
                variant="secondary"
              >
                <ImageIcon aria-hidden="true" className="size-4" />
                {galleryTotal > orderedGallery.length
                  ? `+${galleryTotal - orderedGallery.length} more images`
                  : "Open gallery"}
              </Button>
            ) : null}
          </div>
        ))}
      </section>
    )
  },
)
