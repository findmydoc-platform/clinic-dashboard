"use client"

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ModalProps = {
  children: ReactNode
  description?: string
  footer?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  panelClassName?: string
  side?: "center" | "left"
  title: string
  triggerRef?: RefObject<HTMLButtonElement | null>
}

export function Modal({
  children,
  description,
  footer,
  onOpenChange,
  open,
  panelClassName,
  side = "center",
  title,
  triggerRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const wasOpen = useRef(false)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (wasOpen.current && !open)
      requestAnimationFrame(() => (triggerRef?.current ?? openerRef.current)?.focus())
    wasOpen.current = open
  }, [open, triggerRef])

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={cn(
        "dashboard-dialog max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] p-0 text-[var(--foreground)] shadow-2xl",
        side === "left" &&
          "dashboard-dialog-left m-0 h-dvh max-h-dvh max-w-72 rounded-none border-y-0 border-l-0",
        panelClassName,
      )}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClose={() => {
        if (open) onOpenChange(false)
      }}
      ref={dialogRef}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--secondary)]" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-[var(--foreground)]" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        <Button
          aria-label="Close"
          className="shrink-0"
          onClick={() => onOpenChange(false)}
          size="icon"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-5" />
        </Button>
      </header>
      <div
        aria-label={`${title} content`}
        className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6"
        tabIndex={0}
      >
        {children}
      </div>
      {footer ? (
        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          {footer}
        </footer>
      ) : null}
    </dialog>
  )
}
