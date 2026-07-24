"use client"

import type { ComponentPropsWithoutRef, ComponentRef, ForwardedRef, ReactNode, RefObject } from "react"
import { createContext, forwardRef, useContext, useEffect, useRef } from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

type DropdownMenuContextValue = Readonly<{
  onOpenChange: (open: boolean) => void
  open: boolean
  tabTargetRef: RefObject<HTMLElement | null>
  triggerRef: RefObject<HTMLButtonElement | null>
}>

type DropdownMenuRootProps = Readonly<{
  children: ReactNode
  modal?: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
}>

type DropdownMenuItemProps = Readonly<
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean
    variant?: "default" | "destructive"
  }
>

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null)

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")
const menuItemSelector = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'

function setRef<Value>(ref: ForwardedRef<Value>, value: Value | null) {
  if (typeof ref === "function") {
    ref(value)
    return
  }

  if (ref) ref.current = value
}

function useDropdownMenuContext() {
  const context = useContext(DropdownMenuContext)

  if (!context) throw new Error("DropdownMenu components must be used inside DropdownMenu")

  return context
}

function getTabTarget(trigger: HTMLButtonElement | null, content: HTMLElement, shiftKey: boolean) {
  if (shiftKey) return trigger
  if (!trigger) return null

  const focusableElements = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.getClientRects().length > 0,
  )
  const triggerIndex = focusableElements.indexOf(trigger)

  if (triggerIndex < 0) return null

  return focusableElements.slice(triggerIndex + 1).find((element) => !content.contains(element)) ?? null
}

function DropdownMenuRoot({ children, modal = false, onOpenChange, open }: DropdownMenuRootProps) {
  const tabTargetRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <DropdownMenuContext.Provider value={{ onOpenChange, open, tabTargetRef, triggerRef }}>
      <DropdownMenuPrimitive.Root modal={modal} onOpenChange={onOpenChange} open={open}>
        {children}
      </DropdownMenuPrimitive.Root>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>((props, forwardedRef) => {
  const { triggerRef } = useDropdownMenuContext()

  return (
    <DropdownMenuPrimitive.Trigger
      {...props}
      ref={(node) => {
        triggerRef.current = node
        setRef(forwardedRef, node)
      }}
    />
  )
})
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName

const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(
  (
    { className, collisionPadding = 16, onCloseAutoFocus, onKeyDown, sideOffset = 8, ...props },
    forwardedRef,
  ) => {
    const { onOpenChange, open, tabTargetRef, triggerRef } = useDropdownMenuContext()
    const contentRef = useRef<ComponentRef<typeof DropdownMenuPrimitive.Content>>(null)

    useEffect(() => {
      if (!open) return

      const frame = requestAnimationFrame(() => {
        const content = contentRef.current
        if (!content) return

        const focusedMenuItem = content.ownerDocument.activeElement?.closest(menuItemSelector)
        if (focusedMenuItem && content.contains(focusedMenuItem)) return

        content.querySelector<HTMLElement>(menuItemSelector)?.focus()
      })
      return () => cancelAnimationFrame(frame)
    }, [open])

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={cn(
            "z-50 min-w-40 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] p-1.5 text-[var(--foreground)] shadow-xl focus:outline-none",
            className,
          )}
          collisionPadding={collisionPadding}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event)
            const focusTarget = tabTargetRef.current
            tabTargetRef.current = null
            if (event.defaultPrevented || !focusTarget) return

            event.preventDefault()
            requestAnimationFrame(() => focusTarget.focus())
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented || event.key !== "Tab") return

            event.preventDefault()
            tabTargetRef.current = getTabTarget(triggerRef.current, event.currentTarget, event.shiftKey)
            onOpenChange(false)
          }}
          ref={(node) => {
            contentRef.current = node
            setRef(forwardedRef, node)
          }}
          sideOffset={sideOffset}
          {...props}
        />
      </DropdownMenuPrimitive.Portal>
    )
  },
)
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = forwardRef<ComponentRef<typeof DropdownMenuPrimitive.Item>, DropdownMenuItemProps>(
  ({ className, inset = false, variant = "default", ...props }, forwardedRef) => (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex min-h-11 cursor-default items-center gap-3 rounded-md px-3 text-sm font-bold transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[var(--surface)] data-[highlighted]:text-[var(--foreground)] data-[highlighted]:ring-2 data-[highlighted]:ring-[var(--ring)] data-[highlighted]:ring-inset",
        inset && "pl-9",
        variant === "destructive" &&
          "text-[var(--destructive)] data-[highlighted]:bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))] data-[highlighted]:text-[var(--destructive)]",
        className,
      )}
      data-inset={inset || undefined}
      data-variant={variant}
      ref={forwardedRef}
      {...props}
    />
  ),
)
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ children, className, ...props }, forwardedRef) => (
  <DropdownMenuPrimitive.CheckboxItem
    className={cn(
      "relative flex min-h-11 cursor-default items-center gap-3 rounded-md px-3 text-sm font-bold transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[var(--surface)] data-[highlighted]:text-[var(--foreground)] data-[highlighted]:ring-2 data-[highlighted]:ring-[var(--ring)] data-[highlighted]:ring-inset",
      className,
    )}
    ref={forwardedRef}
    {...props}
  >
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuItemIndicator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.ItemIndicator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.ItemIndicator>
>(({ children = <Check aria-hidden="true" className="size-4" />, className, ...props }, ref) => (
  <DropdownMenuPrimitive.ItemIndicator className={cn("ml-auto", className)} ref={ref} {...props}>
    {children}
  </DropdownMenuPrimitive.ItemIndicator>
))
DropdownMenuItemIndicator.displayName = DropdownMenuPrimitive.ItemIndicator.displayName

const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    className={cn("-mx-1.5 my-1.5 h-px bg-[var(--border)]", className)}
    ref={ref}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  CheckboxItem: DropdownMenuCheckboxItem,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  ItemIndicator: DropdownMenuItemIndicator,
  Separator: DropdownMenuSeparator,
  Trigger: DropdownMenuTrigger,
})
