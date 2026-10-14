import Image from "next/image"
import { ImageIcon, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"
import { isClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import type { DashboardViewModel } from "../../model/dashboard-view-model"
import type { DashboardClinicPreview } from "../../model/dashboard-overview"

type ClinicPreviewProps = Readonly<{
  clinic: DashboardViewModel["clinicPreview"] | DashboardClinicPreview
}>

export function ClinicPreview({ clinic }: ClinicPreviewProps) {
  if ("status" in clinic && clinic.status === "unavailable") {
    return (
      <Card aria-label="Dashboard clinic location summary" className="h-full p-5">
        <h2 className="text-lg font-bold text-[var(--secondary)]">Public clinic preview</h2>
        <p className="mt-2 font-bold">{clinic.name}</p>
        <p className="mt-2 text-sm">Public profile unavailable. No preview is shown.</p>
      </Card>
    )
  }
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
              <span className="mt-2 block text-xs font-bold text-[var(--foreground)]">
                {"imageStatus" in clinic && clinic.imageStatus === "unavailable"
                  ? "Gallery unavailable"
                  : "No gallery image"}
              </span>
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
