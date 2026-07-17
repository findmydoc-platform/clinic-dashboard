"use client"

import { Building2, FileText, LayoutDashboard, MessageSquare, ReceiptText, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ClinicDashboardSection } from "../../model/workspace"
import type { ClinicDashboardNavigationItem } from "../../navigation"

const navigationIcons = {
  "certificates-accreditations": FileText,
  dashboard: LayoutDashboard,
  messages: MessageSquare,
  profile: Building2,
  reviews: Star,
  subscriptions: ReceiptText,
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
            className={cn("relative h-auto min-h-11 w-full justify-start gap-3", isActive && "pl-5")}
            key={item.id}
            onClick={() => onSectionSelect(item.id)}
            variant={isActive ? "accent" : "ghost"}
          >
            {isActive ? (
              <span
                aria-hidden="true"
                className="absolute left-2 h-5 w-1 rounded-full bg-[var(--accent-foreground)]"
              />
            ) : null}
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 text-left break-words whitespace-normal">{item.label}</span>
          </Button>
        )
      })}
    </nav>
  )
}
