"use client"

import type { StaticImageData } from "next/image"
import { useRef, useState } from "react"
import { ChevronDown, CircleUserRound, LogOut, Moon } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Modal } from "@/components/ui/modal"
import { useThemeMode } from "@/components/ui/use-theme-mode"
import { cn } from "@/lib/utils"
import { accountMenuActions, createStaffProfile } from "../../model/account"

type AccountMenuProps = Readonly<{
  avatar?: StaticImageData | string
  initials: string
  initialOpen?: boolean
  name: string
  role: string
}>

export function AccountMenu({ avatar, initials, initialOpen = false, name, role }: AccountMenuProps) {
  const [open, setOpen] = useState(initialOpen)
  const [profileOpen, setProfileOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { isDark, setDarkMode } = useThemeMode()
  const profile = createStaffProfile({ initials, name, role })

  return (
    <div className="relative">
      <DropdownMenu onOpenChange={setOpen} open={open}>
        <DropdownMenu.Trigger asChild>
          <Button
            aria-label={`Open account menu for ${name}`}
            className="gap-1 rounded-full px-1.5"
            ref={triggerRef}
            variant="ghost"
          >
            <Avatar initials={initials} loading="eager" src={avatar} />
            <ChevronDown
              aria-hidden="true"
              className={cn("hidden size-4 transition-transform sm:block", open && "rotate-180")}
            />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          aria-label="Account menu"
          className="w-[calc(100vw-2rem)] max-w-60 p-0 sm:w-60"
        >
          <div className="px-4 py-3">
            <p className="text-sm font-bold">{name}</p>
            <p className="mt-0.5 text-xs text-[var(--foreground)]">{role}</p>
          </div>
          <DropdownMenu.Separator className="mx-0 my-0" />
          <DropdownMenu.Item className="min-h-12 rounded-none px-4" onSelect={() => setProfileOpen(true)}>
            <CircleUserRound aria-hidden="true" className="size-5" />
            <span>{accountMenuActions.profile.label}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="mx-0 my-0" />
          <DropdownMenu.CheckboxItem
            aria-label={accountMenuActions.theme.label}
            checked={isDark}
            className="min-h-12 justify-between rounded-none px-4"
            onCheckedChange={(checked) => setDarkMode(checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            <span className="flex items-center gap-3">
              <Moon aria-hidden="true" className="size-5" />
              <span>{accountMenuActions.theme.label}</span>
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
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator className="mx-0 my-0" />
          <form action="/api/auth/logout" method="post">
            <DropdownMenu.Item asChild onSelect={(event) => event.preventDefault()} variant="destructive">
              <Button className="w-full justify-start rounded-none px-4" type="submit" variant="ghost">
                <LogOut aria-hidden="true" className="size-5" />
                <span>{accountMenuActions.signOut.label}</span>
              </Button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu>
      <Modal onOpenChange={setProfileOpen} open={profileOpen} title="Staff profile" triggerRef={triggerRef}>
        <div className="flex items-center gap-4">
          <Avatar className="size-16 text-base" initials={profile.initials} loading="eager" src={avatar} />
          <div className="min-w-0">
            <p className="font-bold text-[var(--secondary)]">{profile.name}</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">{profile.role}</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
