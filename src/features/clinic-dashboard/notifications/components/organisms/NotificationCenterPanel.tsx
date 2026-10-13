"use client"
import { useEffect, useId, useRef, useState, useCallback } from "react"
import { Bell, X, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { RatingStars } from "@/components/ui/rating-stars"
import { cn } from "@/lib/utils"
import {
  notificationFailureCopy,
  type NotificationLoadState,
  type NotificationView,
  type NotificationMarkState,
} from "../../model/notifications"

type NotificationCenterPanelProps = Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  model: Readonly<{
    state: NotificationLoadState
    unreadCount?: number
    view: NotificationView
    marking?: NotificationMarkState
    isRetryBlocked?: boolean
  }>
  actions: Readonly<{
    selectView: (view: NotificationView) => void
    retry: () => void
    markRead: (ids: readonly string[]) => void
    repeatMark: () => void
  }>
}>
export function NotificationCenterPanel({
  open,
  onOpenChange,
  model,
  actions,
}: NotificationCenterPanelProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLDialogElement | null>(null)
  const attachDialog = useCallback((node: HTMLDialogElement | null) => {
    dialogRef.current = node
    setPortalContainer(node)
  }, [])
  const unreadRef = useRef<HTMLButtonElement>(null)
  const allRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const [menuId, setMenuId] = useState<string | null>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!open) {
      if (dialog.open) {
        dialog.close()
        triggerRef.current?.focus()
      }
      return
    }
    const mobile = window.matchMedia("(max-width: 639px)")
    const show = () => {
      if (dialog.open) dialog.close()
      if (mobile.matches) dialog.showModal()
      else dialog.show()
      unreadRef.current?.focus()
    }
    show()
    const outside = (event: PointerEvent) => {
      if (
        !mobile.matches &&
        event.target instanceof Node &&
        !dialog.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      )
        onOpenChange(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.target instanceof Element && event.target.closest('[role="menu"]')) return
        event.preventDefault()
        onOpenChange(false)
      }
    }
    mobile.addEventListener("change", show)
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => {
      mobile.removeEventListener("change", show)
      document.removeEventListener("pointerdown", outside)
      document.removeEventListener("keydown", escape)
    }
  }, [open, onOpenChange])
  const count = model.unreadCount
  const label =
    count === undefined
      ? "Notifications, count unavailable"
      : `Notifications, ${count} unread ${count === 1 ? "notification" : "notifications"}`
  const state = model.state
  const items = state.status === "ready" && state.response.mode === "page" ? state.response.items : []
  const marking = model.marking ?? { status: "idle" }
  const markedSelection = "notificationIds" in marking ? marking.notificationIds : undefined
  const restoredSelection = useRef<readonly string[] | undefined>(undefined)
  const hasReadyFeed = state.status === "ready"
  useEffect(() => {
    if (
      !open ||
      marking.status !== "confirmed" ||
      !hasReadyFeed ||
      restoredSelection.current === markedSelection
    )
      return
    const frame = requestAnimationFrame(() => {
      restoredSelection.current = markedSelection
      if (document.activeElement === document.body)
        (model.view === "unread" ? unreadRef : allRef).current?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open, marking.status, markedSelection, hasReadyFeed, model.view])
  const markMessage =
    marking.status === "pending"
      ? "Marking as read…"
      : marking.status === "confirmed"
        ? "Marked as read."
        : marking.status === "refresh-failed"
          ? "Marked as read. Notifications couldn't be refreshed."
          : marking.status === "unknown"
            ? "We couldn't confirm whether these notifications were marked as read."
            : marking.status === "rejected"
              ? marking.error === "PAYLOAD_TOO_LARGE"
                ? "These notifications couldn't be marked as read together."
                : "Notifications weren't marked as read."
              : null
  return (
    <div className="relative self-start">
      <Button
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        ref={triggerRef}
        size="icon"
        variant="ghost"
        className="relative"
      >
        <Bell aria-hidden="true" className="size-5" />
        {count === undefined || count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] leading-4 font-bold text-[var(--destructive-foreground)]"
          >
            {count ?? "…"}
          </span>
        ) : null}
      </Button>
      <dialog
        ref={attachDialog}
        id={id}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          event.preventDefault()
          onOpenChange(false)
        }}
        className="fixed inset-x-0 top-auto bottom-0 z-50 m-0 h-[min(85dvh,48rem)] max-h-dvh w-full max-w-none overflow-hidden rounded-t-xl border border-[var(--border)] bg-[var(--background)] p-0 text-[var(--foreground)] shadow-xl sm:absolute sm:top-[calc(100%+0.5rem)] sm:right-0 sm:bottom-auto sm:left-auto sm:h-auto sm:max-h-[calc(100dvh-6rem)] sm:w-[28rem] sm:rounded-lg"
      >
        <div className="flex h-full max-h-[inherit] min-h-0 flex-col sm:h-auto">
          <div className="flex shrink-0 items-center justify-between px-4 pt-3">
            <h2 id={`${id}-title`} className="text-lg font-bold text-[var(--secondary)]">
              Notifications
            </h2>
            <Button
              aria-label="Close notifications"
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
          {markMessage ? (
            <div className="shrink-0 border-b border-[var(--border)] px-4 py-3 text-sm">
              <p
                role={
                  marking.status === "rejected" ||
                  marking.status === "unknown" ||
                  marking.status === "refresh-failed"
                    ? "alert"
                    : "status"
                }
              >
                {markMessage}
              </p>
              {marking.status === "refresh-failed" ? (
                <p className="mt-1">List and unread count may be outdated.</p>
              ) : null}
              {marking.status === "unknown" ? (
                <Button variant="ghost" disabled={model.isRetryBlocked} onClick={actions.retry}>
                  Check status
                </Button>
              ) : null}
              {marking.status === "rejected" || marking.status === "unknown" ? (
                <Button variant="outline" disabled={model.isRetryBlocked} onClick={actions.repeatMark}>
                  Try again
                </Button>
              ) : marking.status === "refresh-failed" ? (
                <Button variant="outline" disabled={model.isRetryBlocked} onClick={actions.retry}>
                  Try again
                </Button>
              ) : null}
              {model.isRetryBlocked ? (
                <p role="status" className="mt-2">
                  Please wait before trying again.
                </p>
              ) : null}
            </div>
          ) : null}
          <div
            role="tablist"
            aria-label="Notification view"
            className="flex shrink-0 border-b border-[var(--border)] px-4"
          >
            {(["unread", "all"] as const).map((view) => (
              <button
                key={view}
                ref={view === "unread" ? unreadRef : allRef}
                type="button"
                role="tab"
                id={`${id}-${view}`}
                aria-selected={model.view === view}
                aria-controls={`${id}-content`}
                tabIndex={model.view === view ? 0 : -1}
                className={cn(
                  "min-h-11 border-b-2 border-transparent px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--primary)]",
                  model.view === view && "border-[var(--primary)] text-[var(--primary)]",
                )}
                onClick={() => actions.selectView(view)}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
                  event.preventDefault()
                  const next =
                    event.key === "Home"
                      ? "unread"
                      : event.key === "End"
                        ? "all"
                        : model.view === "unread"
                          ? "all"
                          : "unread"
                  actions.selectView(next)
                  ;(next === "unread" ? unreadRef : allRef).current?.focus()
                }}
              >
                {view === "all" ? "All" : count === undefined ? "Unread" : `Unread (${count})`}
              </button>
            ))}
          </div>
          <div
            id={`${id}-content`}
            role="tabpanel"
            aria-labelledby={`${id}-${model.view}`}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            tabIndex={0}
          >
            {state.status === "loading" ? (
              <div className="p-6" role="status">
                <p>Loading notifications…</p>
                <div aria-hidden="true" className="mt-4 space-y-4">
                  <div className="h-12 rounded bg-[var(--surface)]" />
                  <div className="h-12 rounded bg-[var(--surface)]" />
                </div>
              </div>
            ) : state.status === "unavailable" ? (
              <div className="p-6">
                <p role="status">{notificationFailureCopy(state.error)}</p>
                {!["UNAUTHENTICATED", "CLINIC_ACCESS_DENIED", "CONTENT_ACCESS_DENIED"].includes(
                  state.error,
                ) ? (
                  <Button variant="outline" className="mt-4" onClick={actions.retry}>
                    {marking.status === "idle" ? "Try again" : "Reload notifications"}
                  </Button>
                ) : null}
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center">
                <p role="status">
                  {model.view === "unread" ? "You're all caught up." : "No notifications yet."}
                </p>
                {model.view === "unread" ? (
                  <Button variant="ghost" className="mt-3" onClick={() => actions.selectView("all")}>
                    View all notifications
                  </Button>
                ) : null}
              </div>
            ) : (
              <ul aria-label="Notifications" className="divide-y divide-[var(--border)]">
                {items.map((item, index) => {
                  const member = item.members[0]!
                  const isUnread = item.members.some((member) => member.readAt === null)
                  const date = member.occurredAt.slice(0, 10)
                  const showDate =
                    index === 0 || items[index - 1]?.members[0]?.occurredAt.slice(0, 10) !== date
                  return (
                    <li key={item.presentationId}>
                      {showDate ? (
                        <h3 className="border-b border-[var(--border)] px-4 py-3 text-xs font-semibold">
                          {state.status === "ready" && state.response.serverTime.slice(0, 10) === date
                            ? "Today · "
                            : ""}
                          {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
                            new Date(member.occurredAt),
                          )}
                        </h3>
                      ) : null}
                      <div
                        className={cn(
                          "flex items-start justify-between gap-3 px-4 py-4",
                          isUnread && "bg-[color-mix(in_srgb,var(--primary)_4%,var(--background))]",
                        )}
                      >
                        <div className="min-w-0">
                          <p className={cn("text-sm break-words", isUnread && "font-bold")}>
                            {item.display.eventLabel}
                          </p>
                          {item.display.displayName ? (
                            <p className="mt-1 text-sm break-words">{item.display.displayName}</p>
                          ) : null}
                          {item.display.rating ? (
                            <RatingStars value={item.display.rating} className="mt-1" />
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <time className="text-xs" dateTime={member.occurredAt}>
                            {new Intl.DateTimeFormat("en", {
                              timeStyle: "short",
                              timeZone: "UTC",
                            }).format(new Date(member.occurredAt))}
                          </time>
                          {isUnread ? (
                            <DropdownMenu
                              open={menuId === item.presentationId}
                              onOpenChange={(next) => setMenuId(next ? item.presentationId : null)}
                            >
                              <DropdownMenu.Trigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Options for ${item.display.eventLabel}${item.display.displayName ? ` from ${item.display.displayName}` : ""}`}
                                  disabled={marking.status === "pending" || model.isRetryBlocked}
                                >
                                  <MoreHorizontal aria-hidden="true" className="size-4" />
                                </Button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content portalContainer={portalContainer} align="end">
                                <DropdownMenu.Item
                                  aria-label={`Mark as read: ${item.display.eventLabel}${item.display.displayName ? ` from ${item.display.displayName}` : ""}`}
                                  onSelect={() =>
                                    actions.markRead(item.members.map((member) => member.notificationId))
                                  }
                                >
                                  Mark as read
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </div>
  )
}
