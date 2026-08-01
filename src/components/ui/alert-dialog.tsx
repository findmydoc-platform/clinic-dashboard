"use client"

import type { ReactNode } from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "@/lib/utils"

type AlertDialogProps = Readonly<{
  actions: ReactNode
  className?: string
  description: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}>

export function AlertDialog({
  actions,
  className,
  description,
  onOpenChange,
  open,
  title,
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-[rgb(0_0_0_/_0.68)] backdrop-blur-[3px] transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <AlertDialogPrimitive.Viewport className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center p-4">
          <AlertDialogPrimitive.Popup
            className={cn(
              "grid w-full max-w-lg gap-5 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 text-[var(--foreground)] shadow-2xl transition-[transform,opacity] data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 sm:p-6",
              className,
            )}
          >
            <div className="grid gap-2">
              <AlertDialogPrimitive.Title className="text-xl font-bold text-[var(--secondary)]">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-sm leading-6 text-[var(--foreground)]">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{actions}</div>
          </AlertDialogPrimitive.Popup>
        </AlertDialogPrimitive.Viewport>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
