"use client"

import { useRef, useState, type ReactNode } from "react"
import { Building2, Headphones, LayoutDashboard, LogOut, Menu, MessageSquare, Star } from "lucide-react"
import { AvatarInitials } from "@/components/atoms/DashboardPrimitives"
import { BrandMark } from "@/components/atoms/BrandMark"
import { InterfaceModeSwitch } from "@/components/molecules/InterfaceModeSwitch"
import { NotificationCenter } from "@/components/molecules/NotificationCenter"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { clinicDashboardFixture, navigationItems } from "@/fixtures/clinic-dashboard"
import {
  isGateVisible,
  type ClinicDashboardSection,
  type ClinicDashboardVariant,
} from "@/lib/clinic-dashboard/visibility"
import type { ClinicDashboardNotification } from "@/lib/clinic-dashboard/notifications"
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
  notificationOpen: boolean
  notificationReadIds: readonly string[]
  notifications: readonly ClinicDashboardNotification[]
  onMarkAllNotificationsAsRead: () => void
  onNotificationOpenChange: (open: boolean) => void
  onShowFullInterfaceChange?: (show: boolean) => void
  onNavigate: (section: ClinicDashboardSection) => void
  showFullInterface?: boolean
  showInterfaceModeToggle?: boolean
  variant: ClinicDashboardVariant
}>

function Navigation({
  activeSection,
  onNavigate,
}: {
  activeSection: ClinicDashboardSection
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
            className={cn(
              "min-h-11 w-full justify-start gap-3",
              active && "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
            )}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            variant="ghost"
          >
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span>{item.label}</span>
          </Button>
        )
      })}
    </nav>
  )
}

function PrototypeBrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex pb-4", className)}>
      <BrandMark priority />
      <span className="absolute top-6 left-[76px] z-10 inline-flex rounded-full bg-[var(--destructive)] px-1.5 py-1 text-[8px] leading-none font-bold tracking-wide text-white uppercase">
        Prototype
      </span>
    </span>
  )
}

export function ClinicDashboardTemplate({
  activeSection,
  children,
  headerActions,
  notificationOpen,
  notificationReadIds,
  notifications,
  onMarkAllNotificationsAsRead,
  onNotificationOpenChange,
  onShowFullInterfaceChange,
  onNavigate,
  showFullInterface = false,
  showInterfaceModeToggle = false,
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
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--background)] p-4 md:flex"
      >
        <div className="relative mb-8 min-h-20">
          <div className="absolute top-11 left-0 flex items-start">
            <PrototypeBrandMark />
            <span className="ml-4 text-xs font-bold text-[var(--foreground)]">Clinic workspace</span>
          </div>
        </div>
        <Navigation activeSection={activeSection} onNavigate={onNavigate} />
        <div className="mt-auto space-y-3">
          {showLaterScope ? (
            <div className="space-y-2 border-t border-[var(--border)] pt-4">
              <Button className="w-full justify-start gap-3" variant="ghost">
                <Headphones aria-hidden="true" className="size-5" /> <span>Contact support</span>
              </Button>
              <Button className="w-full justify-start gap-3" variant="ghost">
                <LogOut aria-hidden="true" className="size-5" /> <span>Sign out</span>
              </Button>
            </div>
          ) : null}
          {showInterfaceModeToggle && onShowFullInterfaceChange ? (
            <InterfaceModeSwitch
              checked={showFullInterface}
              compact
              onCheckedChange={onShowFullInterfaceChange}
            />
          ) : null}
        </div>
      </aside>

      <Modal
        onOpenChange={setMobileNavigationOpen}
        open={mobileNavigationOpen}
        side="left"
        title="Clinic navigation"
        triggerRef={navigationTriggerRef}
      >
        <PrototypeBrandMark className="mb-7" />
        <Navigation activeSection={activeSection} onNavigate={navigate} />
        {showInterfaceModeToggle && onShowFullInterfaceChange ? (
          <InterfaceModeSwitch
            checked={showFullInterface}
            className="mt-8"
            onCheckedChange={onShowFullInterfaceChange}
          />
        ) : null}
      </Modal>

      <div className="md:pl-64">
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
              <div className="truncate text-xs text-[var(--foreground)] lg:hidden">Clinic workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerActions ? <div className="hidden items-center gap-2 sm:flex">{headerActions}</div> : null}
            {showLaterScope ? (
              <NotificationCenter
                notifications={notifications}
                onMarkAllAsRead={onMarkAllNotificationsAsRead}
                onOpenChange={onNotificationOpenChange}
                open={notificationOpen}
                readNotificationIds={notificationReadIds}
              />
            ) : null}
            <AvatarInitials
              initials={clinicDashboardFixture.admin.initials}
              src={clinicDashboardFixture.admin.avatar}
            />
            <span className="hidden text-sm font-bold xl:inline">{clinicDashboardFixture.admin.name}</span>
          </div>
        </header>
        {headerActions ? (
          <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:hidden">
            {headerActions}
          </div>
        ) : null}
        <main className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  )
}
