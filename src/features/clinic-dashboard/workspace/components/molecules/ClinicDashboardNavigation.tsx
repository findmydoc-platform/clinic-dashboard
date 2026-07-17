"use client"

import { Building2, LayoutDashboard, MessageSquare, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ClinicDashboardSection } from "../../model/workspace"
import type { ClinicDashboardNavigationItem } from "../../navigation"

const navigationIcons = {
  dashboard: LayoutDashboard,
  messages: MessageSquare,
  profile: Building2,
  reviews: Star,
} as const

type ClinicDashboardNavigationProps = Readonly<{
  activeSection: ClinicDashboardSection
  items: readonly ClinicDashboardNavigationItem[]
  onSectionSelect: (section: ClinicDashboardSection) => void
}>

export function ClinicDashboardNavigation({
  activeSection,
  items,
  onSectionSelect,
}: ClinicDashboardNavigationProps) {
  return (
    <nav aria-label="Clinic workspace" className="flex flex-col gap-2">
      {items.map((item) => {
        const Icon = navigationIcons[item.id]
        const isActive = item.id === activeSection

        return (
          <Button
            aria-current={isActive ? "page" : undefined}
            className="min-h-11 w-full justify-start gap-3"
            key={item.id}
            onClick={() => onSectionSelect(item.id)}
            variant={isActive ? "primary" : "ghost"}
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span>{item.label}</span>
          </Button>
        )
      })}
    </nav>
  )
}
