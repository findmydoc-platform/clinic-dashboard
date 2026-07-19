"use client"

import { cn } from "@/lib/utils"

type PrototypeModeSwitchProps = Readonly<{
  checked: boolean
  className?: string
  layout?: "compact" | "full"
  onCheckedChange: (checked: boolean) => void
}>

export function PrototypeModeSwitch({
  checked,
  className,
  layout = "full",
  onCheckedChange,
}: PrototypeModeSwitchProps) {
  const isCompact = layout === "compact"

  return (
    <button
      aria-checked={checked}
      aria-label="Demo scope"
      className={cn(
        "flex min-h-14 w-full items-center rounded-xl border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        checked
          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--background))]"
          : "border-[var(--border)] bg-[var(--surface)]",
        isCompact ? "justify-center lg:justify-between lg:p-3" : "justify-between p-3",
        className,
      )}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={cn("min-w-0", isCompact && "sr-only lg:not-sr-only")}>
        <span className="block text-sm font-bold">Demo scope</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--foreground)]">
          {checked ? "All demo screens" : "Core flows"}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-[var(--primary)] bg-[var(--primary)]"
            : "border-[var(--foreground)] bg-[color-mix(in_srgb,var(--foreground)_16%,var(--background))]",
          isCompact && "lg:ml-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full shadow-sm transition-[transform,background-color]",
            checked
              ? "translate-x-[1.35rem] bg-[var(--on-primary)]"
              : "translate-x-0.5 bg-[var(--foreground)]",
          )}
        />
      </span>
    </button>
  )
}
