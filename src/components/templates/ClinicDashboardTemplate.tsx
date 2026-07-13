import type { ReactNode } from "react"
import { LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { BrandMark } from "@/components/atoms/BrandMark"
import { ThemeToggle } from "@/components/molecules/ThemeToggle"

type ClinicDashboardTemplateProps = Readonly<{
  children: ReactNode
}>

export function ClinicDashboardTemplate({ children }: ClinicDashboardTemplateProps) {
  return (
    <div className="min-h-dvh bg-[var(--canvas)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex h-16 max-w-[1620px] items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-3 sm:gap-8">
            <BrandMark className="text-base text-[var(--secondary)]" priority />
            <nav aria-label="Primary navigation">
              <Link
                aria-current="page"
                className="inline-flex h-10 items-center gap-2 px-2 text-sm font-bold text-[var(--secondary)] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                href="/"
              >
                <LayoutDashboard aria-hidden="true" size={17} />
                <span className="hidden sm:inline">Clinic Dashboard</span>
              </Link>
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1620px] px-6 py-10 lg:px-12 lg:py-14">{children}</main>
    </div>
  )
}
