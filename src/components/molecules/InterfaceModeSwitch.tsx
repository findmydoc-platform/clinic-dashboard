"use client"

import { cn } from "@/lib/utils"

type InterfaceModeSwitchProps = Readonly<{
  checked: boolean
  className?: string
  compact?: boolean
  onCheckedChange: (checked: boolean) => void
}>

export function InterfaceModeSwitch({
  checked,
  className,
  compact = false,
  onCheckedChange,
}: InterfaceModeSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label="Full interface"
      className={cn(
        "flex min-h-14 w-full items-center rounded-xl border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        checked
          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--background))]"
          : "border-[var(--border)] bg-[var(--surface)]",
        compact ? "justify-center lg:justify-between lg:p-3" : "justify-between p-3",
        className,
      )}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span className={cn("min-w-0", compact && "sr-only lg:not-sr-only")}>
        <span className="block text-sm font-bold">Full interface</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-[var(--muted-foreground)]">
          {checked ? "All prototype UI" : "Implemented only"}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-[var(--primary)] bg-[var(--primary)]"
            : "border-[var(--muted-foreground)] bg-[var(--background)]",
          compact && "lg:ml-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[1.35rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}
