"use client"

import { useRef, useState, type ReactNode } from "react"
import { Bell, Building2, Headphones, LayoutDashboard, LogOut, Menu, MessageSquare, Star } from "lucide-react"
import { AvatarInitials, DemoPill } from "@/components/atoms/DashboardPrimitives"
import { BrandMark } from "@/components/atoms/BrandMark"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { clinicDashboardFixture, navigationItems } from "@/fixtures/clinic-dashboard"
import {
  isGateVisible,
  type ClinicDashboardSection,
  type ClinicDashboardVariant,
} from "@/lib/clinic-dashboard/visibility"
import { cn } from "@/lib/utils"

const navigationIcons = {
  dashboard: LayoutDashboard,
  messages: MessageSquare,
  profile: Building2,
  reviews: Star,
} as const

type ClinicDashboardTemplateProps = Readonly<{
  activeSection: ClinicDashboardSection
  children: ReactNode
  headerActions?: ReactNode
  onNavigate: (section: ClinicDashboardSection) => void
  variant: ClinicDashboardVariant
}>

function Navigation({
  activeSection,
  compact = false,
  onNavigate,
}: {
  activeSection: ClinicDashboardSection
  compact?: boolean
  onNavigate: (section: ClinicDashboardSection) => void
}) {
  return (
    <nav aria-label="Clinic workspace" className="flex flex-col gap-2">
      {navigationItems.map((item) => {
        const Icon = navigationIcons[item.id]
        const active = item.id === activeSection
        return (
          <Button
            aria-current={active ? "page" : undefined}
            aria-label={compact ? item.label : undefined}
            className={cn(
              "min-h-11 w-full justify-start gap-3",
              compact && "justify-center px-0 lg:justify-start lg:px-4",
              active && "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
            )}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            variant="ghost"
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className={cn(compact && "sr-only lg:not-sr-only")}>{item.label}</span>
          </Button>
        )
      })}
    </nav>
  )
}

export function ClinicDashboardTemplate({
  activeSection,
  children,
  headerActions,
  onNavigate,
  variant,
}: ClinicDashboardTemplateProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)
  const showLaterScope = isGateVisible(variant, "laterScope")
  const navigate = (section: ClinicDashboardSection) => {
    onNavigate(section)
    setMobileNavigationOpen(false)
  }

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--foreground)]" data-clinic-dashboard-root>
      <aside
        aria-label="Desktop clinic navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col border-r border-[var(--border)] bg-[var(--background)] p-4 md:flex lg:w-64"
      >
        <div className="mb-8 flex min-h-14 items-center justify-center lg:justify-start">
          <BrandMark priority />
          <span className="sr-only lg:not-sr-only lg:ml-2 lg:text-xs lg:font-bold lg:text-[var(--muted-foreground)]">
            Clinic workspace
          </span>
        </div>
        <Navigation activeSection={activeSection} compact onNavigate={onNavigate} />
        {showLaterScope ? (
          <div className="mt-auto space-y-2 border-t border-[var(--border)] pt-4">
            <Button className="w-full justify-start gap-3" variant="ghost">
              <Headphones aria-hidden="true" className="size-5" />{" "}
              <span className="sr-only lg:not-sr-only">Contact support</span>
            </Button>
            <Button className="w-full justify-start gap-3" variant="ghost">
              <LogOut aria-hidden="true" className="size-5" />{" "}
              <span className="sr-only lg:not-sr-only">Sign out</span>
            </Button>
          </div>
        ) : null}
      </aside>

      <Modal
        onOpenChange={setMobileNavigationOpen}
        open={mobileNavigationOpen}
        side="left"
        title="Clinic navigation"
        triggerRef={navigationTriggerRef}
      >
        <BrandMark className="mb-7" priority />
        <Navigation activeSection={activeSection} onNavigate={navigate} />
      </Modal>

      <div className="md:pl-20 lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-2 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-expanded={mobileNavigationOpen}
              aria-haspopup="dialog"
              aria-label="Open navigation"
              className="min-h-11 min-w-11 md:hidden"
              onClick={() => setMobileNavigationOpen(true)}
              ref={navigationTriggerRef}
              size="icon"
              variant="ghost"
            >
              <Menu aria-hidden="true" className="size-5" />
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold sm:text-base">
                {clinicDashboardFixture.clinicName}
              </div>
              <div className="truncate text-xs text-[var(--muted-foreground)] lg:hidden">
                Clinic workspace
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerActions ? <div className="hidden items-center gap-2 sm:flex">{headerActions}</div> : null}
            {showLaterScope ? (
              <Button aria-label="Notifications" size="icon" variant="ghost">
                <Bell aria-hidden="true" className="size-5" />
              </Button>
            ) : (
              <DemoPill />
            )}
            <AvatarInitials initials={clinicDashboardFixture.admin.initials} />
            <span className="hidden text-sm font-bold xl:inline">{clinicDashboardFixture.admin.name}</span>
          </div>
        </header>
        {headerActions ? (
          <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:hidden">
            {headerActions}
          </div>
        ) : null}
        <main className="mx-auto max-w-[1620px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
