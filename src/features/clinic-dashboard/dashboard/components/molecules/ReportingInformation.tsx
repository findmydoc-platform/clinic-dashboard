"use client"

import { Popover } from "@base-ui/react/popover"
import { Info, X } from "lucide-react"
import { useId, useRef, useState } from "react"

type ReportingInformationProps = Readonly<{ label: string; children: string }>

export function ReportingInformation({ label, children }: ReportingInformationProps) {
  const [mode, setMode] = useState<"closed" | "transient" | "persistent">("closed")
  const triggerId = useId()
  const suppressFocusOpen = useRef(false)

  return (
    <Popover.Root
      open={mode !== "closed"}
      triggerId={triggerId}
      onOpenChange={(open, details) => {
        if (details.reason === "trigger-press" && mode === "transient") {
          details.cancel()
          setMode("persistent")
          return
        }
        if (!open && mode === "persistent" && details.reason === "trigger-hover") {
          details.cancel()
          return
        }
        if (!open && (details.reason === "escape-key" || details.reason === "close-press"))
          suppressFocusOpen.current = true
        setMode(open ? (details.reason === "trigger-press" ? "persistent" : "transient") : "closed")
      }}
    >
      <Popover.Trigger
        aria-label={`About ${label}`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        delay={150}
        id={triggerId}
        onFocus={() => {
          if (suppressFocusOpen.current) suppressFocusOpen.current = false
          else if (mode === "closed") setMode("transient")
        }}
        openOnHover
      >
        <Info aria-hidden="true" className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner collisionPadding={16} sideOffset={8} className="z-50">
          <Popover.Popup
            className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)] shadow-lg"
            initialFocus={false}
          >
            <div className="flex items-start justify-between gap-2">
              <Popover.Title className="font-bold text-[var(--secondary)]">About {label}</Popover.Title>
              <Popover.Close
                aria-label="Close explanation"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
              >
                <X aria-hidden="true" className="size-4" />
              </Popover.Close>
            </div>
            <Popover.Description>{children}</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
