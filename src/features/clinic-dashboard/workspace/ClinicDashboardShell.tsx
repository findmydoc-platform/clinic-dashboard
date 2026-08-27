"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Headphones, Menu } from "lucide-react"
import { BrandMark } from "@/components/brand/BrandMark"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { cn } from "@/lib/utils"
import { ClinicDashboardNavigation } from "./components/molecules/ClinicDashboardNavigation"
import type { ClinicDashboardSection } from "./model/workspace"
import type { ClinicDashboardNavigationItem } from "./navigation"

type ClinicDashboardShellProps = Readonly<{
  accountMenu: ReactNode
  activeSection: ClinicDashboardSection
  children: ReactNode
  clinicIdentity: ReactNode
  environmentBadge?: string
  headerActions?: ReactNode
  interfaceModeControls?: Readonly<{
    desktop: ReactNode
    mobile: ReactNode
  }>
  items: readonly ClinicDashboardNavigationItem[]
  inquiryUnreadCount?: number
  notificationCenter?: ReactNode
  onSectionSelect: (section: ClinicDashboardSection) => void
  onSupportRequest?: () => void
}>

function EnvironmentBadge({ className, label }: Readonly<{ className?: string; label: string }>) {
  return (
    <span
      aria-label={`${label} workspace`}
      className={cn(
        "inline-flex shrink-0 rounded-md border border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_14%,var(--background))] px-2 py-1 text-[11px] leading-none font-bold tracking-wide text-[var(--secondary)] uppercase",
        className,
      )}
    >
      {label}
    </span>
  )
}

function WorkspaceBrand({ badge, className }: Readonly<{ badge?: string; className?: string }>) {
  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <BrandMark priority />
      {badge ? <EnvironmentBadge label={badge} /> : null}
    </div>
  )
}

export function ClinicDashboardShell({
  accountMenu,
  activeSection,
  children,
  clinicIdentity,
  environmentBadge,
  headerActions,
  interfaceModeControls,
  items,
  inquiryUnreadCount = 0,
  notificationCenter,
  onSectionSelect,
  onSupportRequest,
}: ClinicDashboardShellProps) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)
  const navigationTriggerRef = useRef<HTMLButtonElement>(null)
  const supportRequestFrameRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (supportRequestFrameRef.current !== null) cancelAnimationFrame(supportRequestFrameRef.current)
    },
    [],
  )

  const selectSection = (section: ClinicDashboardSection) => {
    onSectionSelect(section)
    setMobileNavigationOpen(false)
  }
  const openMobileSupport = () => {
    if (!onSupportRequest) return

    setMobileNavigationOpen(false)
    supportRequestFrameRef.current = requestAnimationFrame(() => {
      supportRequestFrameRef.current = null
      onSupportRequest()
    })
  }

  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--foreground)]" data-clinic-dashboard-root>
      <a
        className="fixed top-3 left-3 z-[100] -translate-y-24 rounded-md bg-[var(--background)] px-4 py-2 font-bold text-[var(--secondary)] shadow-lg transition-transform focus:translate-y-0 focus:ring-2 focus:ring-[var(--ring)] focus:outline-none"
        href="#clinic-dashboard-main"
      >
        Skip to main content
      </a>
      <aside
        aria-label="Desktop clinic navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--background)] p-4 md:flex"
      >
        <div className="relative mb-8 min-h-20">
          <WorkspaceBrand badge={environmentBadge} className="absolute top-6 left-0" />
        </div>
        <ClinicDashboardNavigation
          activeSection={activeSection}
          inquiryUnreadCount={inquiryUnreadCount}
          items={items}
          onSectionSelect={onSectionSelect}
        />
        <div className="mt-auto space-y-3">
          {onSupportRequest ? (
            <div className="space-y-2 border-t border-[var(--border)] pt-4">
              <Button
                className="w-full justify-start gap-3"
                onClick={() => onSupportRequest()}
                variant="ghost"
              >
                <Headphones aria-hidden="true" className="size-5" /> <span>Contact support</span>
              </Button>
            </div>
          ) : null}
          {interfaceModeControls?.desktop}
        </div>
      </aside>

      <Modal
        onOpenChange={setMobileNavigationOpen}
        open={mobileNavigationOpen}
        side="left"
        title="Clinic navigation"
        triggerRef={navigationTriggerRef}
      >
        <WorkspaceBrand badge={environmentBadge} className="mb-7" />
        <ClinicDashboardNavigation
          activeSection={activeSection}
          inquiryUnreadCount={inquiryUnreadCount}
          items={items}
          onSectionSelect={selectSection}
        />
        {onSupportRequest ? (
          <Button
            className="mt-6 w-full justify-start gap-3 border-t border-[var(--border)] pt-6"
            onClick={openMobileSupport}
            variant="ghost"
          >
            <Headphones aria-hidden="true" className="size-5" /> <span>Contact support</span>
          </Button>
        ) : null}
        {interfaceModeControls?.mobile}
      </Modal>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-2 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
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
            {clinicIdentity}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {environmentBadge ? (
              <EnvironmentBadge className="hidden sm:inline-flex md:hidden" label={environmentBadge} />
            ) : null}
            {headerActions ? <div className="hidden items-center gap-2 sm:flex">{headerActions}</div> : null}
            {notificationCenter}
            {accountMenu}
          </div>
        </header>
        {headerActions ? (
          <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:hidden">
            {headerActions}
          </div>
        ) : null}
        <main
          className={cn(
            "min-w-0",
            activeSection === "messages"
              ? "max-w-none p-0"
              : "mx-auto max-w-[1440px] p-4 sm:p-6 lg:px-8 lg:py-7",
          )}
          id="clinic-dashboard-main"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
