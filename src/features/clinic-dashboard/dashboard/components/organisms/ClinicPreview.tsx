import Image from "next/image"
import { ImageIcon, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { isClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import type { DashboardViewModel } from "../../model/dashboard-view-model"

type ClinicPreviewProps = Readonly<{
  clinic: DashboardViewModel["clinicPreview"]
}>

export function ClinicPreview({ clinic }: ClinicPreviewProps) {
  return (
    <Card aria-label="Dashboard clinic location summary" className="h-full overflow-hidden">
      <div className="relative h-28">
        {clinic.coverImage ? (
          <Image
            alt={clinic.coverAlt ?? "Clinic gallery main image"}
            className="object-cover"
            fill
            loading="eager"
            sizes="(min-width: 1280px) 280px, 100vw"
            src={clinic.coverImage}
            unoptimized={isClinicGalleryImageProxyUrl(clinic.coverImage)}
          />
        ) : (
          <div className="grid h-full place-items-center bg-[var(--surface)] text-center">
            <div>
              <ImageIcon aria-hidden="true" className="mx-auto size-6 text-[var(--primary)]" />
              <span className="mt-2 block text-xs font-bold text-[var(--foreground)]">No gallery image</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="text-xs font-bold text-[var(--foreground)]">Public clinic preview</div>
        <div className="mt-2 flex items-center justify-between">
          <strong>{clinic.name}</strong>
          <span className="font-bold text-[var(--primary)]">{clinic.ratingLabel}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-[var(--foreground)]">
          <MapPin aria-hidden="true" className="size-3" /> {clinic.location}
        </div>
      </div>
    </Card>
  )
}
