import Image from "next/image"
import { forwardRef } from "react"
import { ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ClinicGalleryItem } from "../../model/clinic-profile"

type ClinicProfileGalleryProps = Readonly<{
  gallery: readonly ClinicGalleryItem[]
  galleryTotal: number
  onOpen: () => void
}>

export const ClinicProfileGallery = forwardRef<HTMLElement, ClinicProfileGalleryProps>(
  function ClinicProfileGallery({ gallery, galleryTotal, onOpen }, ref) {
    const cover = gallery.find((item) => item.isCover) ?? gallery[0]
    const orderedGallery = cover ? [cover, ...gallery.filter((item) => item.id !== cover.id)] : gallery

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
            />
            {index === 3 ? (
              <Button
                className="absolute right-3 bottom-3 min-h-9 bg-[var(--background)] px-3 py-1 text-xs shadow"
                onClick={onOpen}
                size="small"
                variant="secondary"
              >
                <ImageIcon aria-hidden="true" className="size-4" /> +{Math.max(0, galleryTotal - 4)} more
                images
              </Button>
            ) : null}
          </div>
        ))}
      </section>
    )
  },
)
