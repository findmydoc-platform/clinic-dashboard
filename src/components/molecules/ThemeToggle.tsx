"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ThemeToggleProps = Readonly<{
  showLabel?: boolean
  variant?: "icon" | "switch"
}>

const subscribeToHydration = () => () => undefined

export function ThemeToggle({ showLabel = false, variant = "icon" }: ThemeToggleProps) {
  const { forcedTheme, resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
  const isDark = mounted && (forcedTheme ?? resolvedTheme) === "dark"
  const nextTheme = isDark ? "light" : "dark"
  const label = mounted ? `Switch to ${nextTheme} theme` : "Toggle color theme"

  if (variant === "switch") {
    return (
      <button
        aria-checked={isDark}
        aria-label="Dark mode"
        className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm font-bold transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
        onClick={() => setTheme(nextTheme)}
        role="switch"
        type="button"
      >
        <span className="flex items-center gap-3">
          <Moon aria-hidden="true" className="size-5" />
          <span>Dark mode</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors",
            isDark
              ? "border-[var(--primary)] bg-[var(--primary)]"
              : "border-[var(--muted-foreground)] bg-[var(--background)]",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-[1.125rem] rounded-full bg-white shadow-sm transition-transform",
              isDark ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
    )
  }

  return (
    <Button
      aria-label={label}
      onClick={() => setTheme(nextTheme)}
      size={showLabel ? "default" : "icon"}
      title={label}
      variant="ghost"
    >
      {isDark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
      {showLabel ? <span>{isDark ? "Light theme" : "Dark theme"}</span> : null}
    </Button>
  )
}
