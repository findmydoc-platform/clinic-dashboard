import Image from "next/image"
import { MapPin } from "lucide-react"
import exteriorImage from "@/assets/clinic-dashboard/exterior.jpg"
import { Card } from "@/components/ui/card"
import type { DashboardViewModel } from "../../model/dashboard-view-model"

type ClinicPreviewProps = Readonly<{
  clinic: DashboardViewModel["clinicPreview"]
}>

export function ClinicPreview({ clinic }: ClinicPreviewProps) {
  return (
    <Card aria-label="Dashboard clinic location summary" className="h-full overflow-hidden">
      <div className="relative h-28">
        <Image
          alt="Exterior of Berlin Health Clinic"
          className="object-cover"
          fill
          loading="eager"
          sizes="(min-width: 1280px) 280px, 100vw"
          src={exteriorImage}
        />
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
