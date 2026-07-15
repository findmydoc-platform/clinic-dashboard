"use client"

import type { StaticImageData } from "next/image"
import { useEffect, useId, useRef, useState } from "react"
import { LogOut } from "lucide-react"
import { AvatarInitials } from "@/components/atoms/DashboardPrimitives"
import { Button } from "@/components/ui/button"

type AccountMenuProps = Readonly<{
  avatar?: StaticImageData | string
  initials: string
  initialOpen?: boolean
  name: string
  role: string
}>

export function AccountMenu({ avatar, initials, initialOpen = false, name, role }: AccountMenuProps) {
  const [open, setOpen] = useState(initialOpen)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) requestAnimationFrame(() => buttonRef.current?.focus())
      wasOpen.current = false
      return
    }

    wasOpen.current = true
    requestAnimationFrame(() => panelRef.current?.focus())

    const closeMenu = () => setOpen(false)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      closeMenu()
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      closeMenu()
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [open])

  return (
    <div className="relative">
      <Button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Open account menu for ${name}`}
        className="rounded-full"
        onClick={() => setOpen((current) => !current)}
        ref={buttonRef}
        size="icon"
        variant="ghost"
      >
        <AvatarInitials initials={initials} src={avatar} />
      </Button>
      {open ? (
        <div
          aria-label="Account menu"
          className="fixed top-[4.5rem] right-4 z-50 w-[calc(100vw-2rem)] max-w-60 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-xl focus:outline-none sm:absolute sm:top-[calc(100%+0.5rem)] sm:right-0 sm:w-60"
          id={panelId}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="px-4 py-3">
            <p className="text-sm font-bold">{name}</p>
            <p className="mt-0.5 text-xs text-[var(--foreground)]">{role}</p>
          </div>
          <form action="/api/auth/logout" className="border-t border-[var(--border)]" method="post">
            <Button className="w-full justify-start rounded-none px-4" type="submit" variant="ghost">
              <LogOut aria-hidden="true" className="size-5" />
              <span>Sign out</span>
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
