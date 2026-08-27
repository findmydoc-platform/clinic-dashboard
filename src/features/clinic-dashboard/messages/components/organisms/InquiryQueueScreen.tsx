"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  LockKeyhole,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { InquiryActionsMenu } from "../molecules/InquiryActionsMenu"
import { InquiryComposer } from "../molecules/InquiryComposer"
import { InquiryContactReauthenticationDialog } from "../molecules/InquiryContactReauthenticationDialog"
import { InquiryListItem } from "../molecules/InquiryListItem"
import { InquiryPlainText } from "../molecules/InquiryPlainText"
import { InquiryStatusMenu } from "../molecules/InquiryStatusMenu"
import {
  formatInquiryAttachmentSize,
  type InquiryAttachmentAccessPaths,
  type InquiryPrimaryFilter,
  type InquiryWorkspaceActions,
  type InquiryWorkspaceViewModel,
} from "../../model/inquiry-workspace"
import {
  getInquiryHandlingStatusLabel,
  type InquiryHandlingStatus,
  type InquiryTimelineItem,
  type PatientInquiry,
  type PatientInquiryDetail,
} from "../../model/inquiries"

type InquiryQueueScreenProps = Readonly<{
  actions: InquiryWorkspaceActions
  focusHeading?: boolean
  focusInquiryId?: string
  model: InquiryWorkspaceViewModel
  onFocusHandled?: () => void
}>

type EditableHandlingStatus = Exclude<InquiryHandlingStatus, "spam">

const primaryFilters = [
  "open",
  "unread",
  "closed",
  "spam",
  "all",
] as const satisfies readonly InquiryPrimaryFilter[]
const editableHandlingStatuses = [
  "submitted",
  "in_review",
  "contacted",
] as const satisfies readonly EditableHandlingStatus[]

function InquiryBadge({ inquiry }: Readonly<{ inquiry: PatientInquiry }>) {
  if (inquiry.handlingStatus === "spam") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--destructive)_12%,var(--background))] px-2 py-1 text-xs font-bold text-[var(--destructive)]">
        <ShieldAlert aria-hidden="true" className="size-3.5" /> Spam
      </span>
    )
  }

  if (inquiry.conversation.kind === "deleted-patient") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] font-bold text-[var(--foreground)]">
        <UserRound aria-hidden="true" className="size-3.5" /> Patient deleted · No chat
      </span>
    )
  }

  if (inquiry.conversation.kind === "guest") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] font-bold text-[var(--foreground)]">
        <UserRound aria-hidden="true" className="size-3.5" /> Guest inquiry · No chat
      </span>
    )
  }

  return null
}

function StatusFilters({
  actions,
  model,
}: Readonly<{ actions: InquiryWorkspaceActions; model: InquiryWorkspaceViewModel }>) {
  const [open, setOpen] = useState(false)
  const label =
    model.handlingStatusFilter.length === 0
      ? "All statuses"
      : model.handlingStatusFilter.map(getInquiryHandlingStatusLabel).join(", ")

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenu.Trigger asChild>
        <Button
          aria-label={`Filter by status. ${label}`}
          className="w-full justify-between font-normal"
          disabled={model.lifecycleFilter === "spam" || model.isLoadingQueue}
          variant="outline"
        >
          <span className="truncate">{label}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start" aria-label="Filter by status" className="w-64">
        <DropdownMenu.Item onSelect={() => actions.onStatusFilterChange([])}>All statuses</DropdownMenu.Item>
        <DropdownMenu.Separator />
        {editableHandlingStatuses.map((status) => (
          <DropdownMenu.CheckboxItem
            checked={model.handlingStatusFilter.includes(status)}
            key={status}
            onCheckedChange={(checked) =>
              actions.onStatusFilterChange(
                checked
                  ? [...model.handlingStatusFilter, status]
                  : model.handlingStatusFilter.filter((current) => current !== status),
              )
            }
            onSelect={(event) => event.preventDefault()}
          >
            {getInquiryHandlingStatusLabel(status)}
            <DropdownMenu.ItemIndicator />
          </DropdownMenu.CheckboxItem>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

function QueueFilters({
  actions,
  model,
}: Readonly<{ actions: InquiryWorkspaceActions; model: InquiryWorkspaceViewModel }>) {
  return (
    <div className="space-y-3 border-b border-[var(--border)] bg-[var(--background)] p-4">
      <label className="relative block">
        <span className="sr-only">Search inquiries</span>
        <Search
          aria-hidden="true"
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--foreground)]"
        />
        <Input
          className="pl-9 text-sm"
          disabled={model.availability === "temporarily-unavailable"}
          onValueChange={actions.onSearchQueryChange}
          placeholder="Search inquiries…"
          type="search"
          value={model.searchQuery}
        />
      </label>
      <div aria-label="Inquiry lifecycle filter" className="flex flex-wrap gap-1" role="group">
        {primaryFilters.map((filter) => (
          <button
            aria-pressed={model.lifecycleFilter === filter}
            className={cn(
              "min-h-11 rounded-md px-2.5 text-xs font-bold capitalize focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
              model.lifecycleFilter === filter
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--foreground)] hover:bg-[var(--surface)]",
            )}
            disabled={model.availability === "temporarily-unavailable" || model.isLoadingQueue}
            key={filter}
            onClick={() => actions.onPrimaryFilterChange(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>
      <StatusFilters actions={actions} model={model} />
    </div>
  )
}

function QueuePane({
  actions,
  headingRef,
  inquiryRefs,
  model,
}: Readonly<{
  actions: InquiryWorkspaceActions
  headingRef: React.RefObject<HTMLHeadingElement | null>
  inquiryRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>
  model: InquiryWorkspaceViewModel
}>) {
  return (
    <section
      aria-labelledby="inquiry-list-heading"
      className={cn(
        "flex min-h-0 min-w-0 flex-col border-r border-[var(--border)] bg-[var(--background)]",
        model.mobileDetailOpen && "max-xl:hidden",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
        <div>
          <h1
            className="text-xl font-bold text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            id="inquiry-list-heading"
            ref={headingRef}
            tabIndex={-1}
          >
            Inquiries
          </h1>
          <p className="mt-1 text-xs text-[var(--foreground)]">Shared clinic workspace</p>
        </div>
        {model.totalUnreadCount > 0 ? (
          <span className="rounded-full bg-[var(--primary)] px-2 py-1 text-xs font-bold text-[var(--on-primary)]">
            {model.totalUnreadCount} unread
          </span>
        ) : null}
      </div>

      <QueueFilters actions={actions} model={model} />

      <div className="min-h-0 flex-1 overflow-y-auto" data-inquiry-queue>
        <p aria-live="polite" className="sr-only" role="status">
          {model.visibleInquiries.length === 1
            ? "1 inquiry shown."
            : `${model.visibleInquiries.length} inquiries shown.`}
        </p>
        {model.availability === "temporarily-unavailable" ? (
          <div className="px-5 py-12 text-center" role="alert">
            <CircleAlert aria-hidden="true" className="mx-auto size-7 text-[var(--destructive)]" />
            <p className="mt-3 text-sm font-bold text-[var(--secondary)]">Inquiries are unavailable</p>
            <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">
              Your session may have ended, or the inquiry service could not be reached.
            </p>
            <Button className="mt-4" onClick={() => void actions.onQueueRefresh()} variant="outline">
              <RefreshCw aria-hidden="true" className="size-4" /> Try again
            </Button>
          </div>
        ) : model.visibleInquiries.length === 0 && !model.isLoadingQueue ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-bold text-[var(--secondary)]">No inquiries match these filters.</p>
            <p className="mt-1 text-sm text-[var(--foreground)]">Adjust the search or filters to continue.</p>
          </div>
        ) : (
          <ul aria-label="Inquiries" className="divide-y divide-[var(--border)]">
            {model.visibleInquiries.map(({ inquiry, isActive }) => (
              <li key={inquiry.id}>
                <InquiryListItem
                  active={isActive}
                  inquiry={inquiry}
                  onSelect={() => void actions.onInquirySelect(inquiry.id)}
                  ref={(element) => {
                    inquiryRefs.current[inquiry.id] = element
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        {model.isLoadingQueue ? (
          <p
            aria-live="polite"
            className="flex items-center justify-center gap-2 p-5 text-sm text-[var(--foreground)]"
            role="status"
          >
            <RefreshCw aria-hidden="true" className="size-4 animate-spin" /> Loading inquiries…
          </p>
        ) : model.nextCursor ? (
          <div className="p-4">
            <Button className="w-full" onClick={() => void actions.onLoadMore()} variant="outline">
              Load more
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ContactDetails({
  actions,
  inquiry,
  isMutating,
}: Readonly<{
  actions: InquiryWorkspaceActions
  inquiry: PatientInquiryDetail
  isMutating: boolean
}>) {
  return (
    <details className="group mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 text-left text-xs font-bold text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
        {inquiry.contact.state === "masked" ? "Protected contact details" : "Contact details"}
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-[var(--border)] pt-3 text-sm text-[var(--foreground)]">
        {inquiry.contact.state === "full" ? (
          <div className="space-y-2">
            {inquiry.contact.email ? (
              <p className="flex min-w-0 items-center gap-2">
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                <span className="break-all">{inquiry.contact.email}</span>
              </p>
            ) : null}
            {inquiry.contact.phone ? (
              <p className="flex min-w-0 items-center gap-2">
                <Phone aria-hidden="true" className="size-4 shrink-0" />
                <span>{inquiry.contact.phone}</span>
              </p>
            ) : null}
            <p className="text-xs leading-5">
              Read-only. Off-platform contact is not added to the conversation automatically.
            </p>
          </div>
        ) : inquiry.contact.state === "masked" ? (
          <div>
            <p className="text-xs leading-5">
              Reauthentication is required before protected contact details are shown.
            </p>
            {inquiry.actions.canRevealContact ? (
              <Button
                className="mt-3"
                disabled={isMutating}
                onClick={() => void actions.onContactReveal()}
                variant="outline"
              >
                Reveal contact details
              </Button>
            ) : null}
          </div>
        ) : inquiry.contact.state === "unavailable" ? (
          <p className="text-xs leading-5">
            Contact details were removed when the patient identity was deleted.
          </p>
        ) : (
          <p className="text-xs leading-5">
            No verified contact details are available for this guest inquiry.
          </p>
        )}
      </div>
    </details>
  )
}

function InquiryContext({
  actions,
  inquiry,
  isMutating,
}: Readonly<{
  actions: InquiryWorkspaceActions
  inquiry: PatientInquiryDetail
  isMutating: boolean
}>) {
  return (
    <details className="group border-b border-[var(--border)] bg-[var(--background)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:px-5">
        Inquiry details
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          strokeWidth={2.5}
        />
      </summary>
      <div className="border-t border-[var(--border)] px-4 py-4 sm:px-5">
        <div className="mx-auto w-full max-w-[68rem]">
          <section
            aria-labelledby={`original-request-${inquiry.id}`}
            className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
          >
            <h3
              className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase"
              id={`original-request-${inquiry.id}`}
            >
              Original request
            </h3>
            {inquiry.originalRequestContentState === "hard-deleted" ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[var(--secondary)]">
                <ShieldAlert aria-hidden="true" className="size-4" /> Inquiry deleted
              </p>
            ) : inquiry.originalRequest ? (
              <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">
                <InquiryPlainText text={inquiry.originalRequest} />
              </p>
            ) : null}
          </section>
          {inquiry.originalRequestContentState !== "hard-deleted" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--background)] text-[var(--secondary)]">
                  <CalendarClock aria-hidden="true" className="size-4" />
                </span>
                <dl className="min-w-0">
                  <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                    Treatment timeline
                  </dt>
                  <dd className="mt-1 text-sm font-bold break-words text-[var(--secondary)]">
                    {inquiry.treatmentTimeline}
                  </dd>
                </dl>
              </div>
              <div className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--background)] text-[var(--secondary)]">
                  <Clock3 aria-hidden="true" className="size-4" />
                </span>
                <dl className="min-w-0">
                  <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                    Preferred contact time
                  </dt>
                  <dd className="mt-1 text-sm font-bold break-words text-[var(--secondary)]">
                    {inquiry.contactWindow}
                  </dd>
                </dl>
              </div>
            </div>
          ) : null}
          <ContactDetails actions={actions} inquiry={inquiry} isMutating={isMutating} />
        </div>
      </div>
    </details>
  )
}

function TimelineEntry({
  attachmentAccessPaths,
  item,
}: Readonly<{
  attachmentAccessPaths: Readonly<Record<string, InquiryAttachmentAccessPaths>>
  item: InquiryTimelineItem
}>) {
  if (item.kind === "system-event") {
    return (
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
        <p className="flex max-w-[86%] items-center gap-2 rounded-md bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
          <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            {item.body} · {item.actorName} · {item.timeLabel}
          </span>
        </p>
        <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
      </div>
    )
  }

  if (item.kind === "internal-note") {
    if (item.contentState === "hard-deleted") {
      return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--secondary)]">
          <p className="inline-flex items-center gap-2 font-bold">
            <ShieldAlert aria-hidden="true" className="size-4" /> Internal note deleted
          </p>
          <span className="mt-1 block text-xs text-[var(--foreground)]">{item.timeLabel}</span>
        </div>
      )
    }
    return (
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_65%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_35%,var(--background))] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="flex items-center gap-2 text-xs text-[var(--secondary)]">
            <LockKeyhole aria-hidden="true" className="size-3.5" /> Internal note · Clinic only
          </strong>
          <span className="text-xs text-[var(--foreground)]">
            {item.authorName} · {item.timeLabel}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">
          <InquiryPlainText text={item.body ?? ""} />
        </p>
      </div>
    )
  }

  const isClinic = item.author.kind === "clinic"
  const contentState = item.contentState ?? "available"
  const attachmentState = item.attachmentState ?? (item.attachment ? "available" : undefined)
  const hasDeletedContent = contentState === "hard-deleted" || attachmentState === "hard-deleted"
  const accessPaths =
    item.attachment && attachmentState === "available" ? attachmentAccessPaths[item.attachment.id] : undefined
  return (
    <div className={cn("flex", isClinic && !hasDeletedContent && "justify-end")}>
      <div className={cn("max-w-[92%] sm:max-w-[72%]", isClinic && !hasDeletedContent && "text-right")}>
        <div
          className={cn(
            "rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left text-sm leading-6 shadow-sm",
            isClinic &&
              !hasDeletedContent &&
              "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]",
          )}
        >
          {contentState === "restricted" ? (
            <p className="inline-flex items-center gap-2 font-bold">
              <LockKeyhole aria-hidden="true" className="size-4" /> Message unavailable
            </p>
          ) : contentState === "hard-deleted" ? (
            <p className="inline-flex items-center gap-2 font-bold">
              <ShieldAlert aria-hidden="true" className="size-4" /> Message deleted
            </p>
          ) : item.body ? (
            <p>
              <InquiryPlainText text={item.body} />
            </p>
          ) : null}
          {attachmentState === "restricted" ? (
            <div className="mt-3 flex min-h-11 items-center gap-3 rounded-lg bg-[var(--surface)] p-3 text-left font-bold text-[var(--secondary)]">
              <LockKeyhole aria-hidden="true" className="size-5 shrink-0" /> Attachment unavailable
            </div>
          ) : attachmentState === "hard-deleted" ? (
            <div className="mt-3 flex min-h-11 items-center gap-3 rounded-lg bg-[var(--surface)] p-3 text-left font-bold text-[var(--secondary)]">
              <ShieldAlert aria-hidden="true" className="size-5 shrink-0" /> Attachment deleted
            </div>
          ) : item.attachment ? (
            <div
              className={cn(
                "mt-3 flex min-h-11 flex-wrap items-center gap-3 rounded-lg bg-[var(--surface)] p-3 text-[var(--secondary)]",
                contentState === "available" && !item.body && "mt-0",
              )}
            >
              <FileText aria-hidden="true" className="size-5 shrink-0" />
              <span className="min-w-0 flex-1 text-left">
                <strong className="block truncate">{item.attachment.name}</strong>
                <span className="block text-xs">
                  {item.attachment.mimeType} · {formatInquiryAttachmentSize(item.attachment.sizeBytes)}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3 text-xs font-bold">
                {accessPaths ? (
                  <a
                    className="text-[var(--primary)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    href={accessPaths.preview}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Preview
                  </a>
                ) : null}
                {accessPaths ? (
                  <a
                    className="text-[var(--primary)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    download
                    href={accessPaths.download}
                  >
                    Download
                  </a>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>
        <span className="mt-1 block text-xs text-[var(--foreground)]">
          {hasDeletedContent
            ? item.timeLabel
            : `${isClinic ? (item.author.staffName ?? item.author.label) : item.author.label} · ${item.timeLabel}`}
        </span>
      </div>
    </div>
  )
}

function InquiryTimeline({
  attachmentAccessPaths,
  inquiry,
}: Readonly<{
  attachmentAccessPaths: Readonly<Record<string, InquiryAttachmentAccessPaths>>
  inquiry: PatientInquiryDetail
}>) {
  return (
    <div
      aria-label={`Activity for ${inquiry.patient.name}`}
      aria-live="polite"
      aria-relevant="additions"
      className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas)] p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:p-6"
      role="log"
      tabIndex={0}
    >
      <div className="mx-auto w-full max-w-[68rem] space-y-5">
        <div className="flex items-center gap-3" role="separator">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
            Latest activity
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {inquiry.timeline.length > 0 ? (
          inquiry.timeline.map((item) => (
            <TimelineEntry attachmentAccessPaths={attachmentAccessPaths} item={item} key={item.id} />
          ))
        ) : (
          <p className="py-10 text-center text-sm text-[var(--foreground)]">No conversation activity yet.</p>
        )}
      </div>
    </div>
  )
}

function DetailHeader({
  actions,
  hasPendingReplyDraft,
  headingRef,
  inquiry,
  isMutating,
  onBack,
}: Readonly<{
  actions: InquiryWorkspaceActions
  hasPendingReplyDraft: boolean
  headingRef: React.RefObject<HTMLHeadingElement | null>
  inquiry: PatientInquiryDetail
  isMutating: boolean
  onBack: () => void
}>) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Button
          aria-label="Back to inquiries"
          className="xl:hidden"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Button>
        {inquiry.patient.kind === "deleted" ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--foreground)]">
            <UserRound aria-hidden="true" className="size-5" />
          </span>
        ) : (
          <Avatar className="size-12 shrink-0" initials={inquiry.patient.initials || "PI"} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-lg leading-6 font-bold break-words text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:text-xl"
              ref={headingRef}
              tabIndex={-1}
            >
              {inquiry.patient.name}
            </h2>
            <InquiryBadge inquiry={inquiry} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--foreground)]">
            {inquiry.patient.kind === "deleted" ? (
              <span className="font-bold">Inquiry {inquiry.id}</span>
            ) : null}
            <span className="min-w-0 break-words">{inquiry.interest}</span>
            <span className="inline-flex items-center gap-1 font-bold">
              {inquiry.lifecycle === "open" ? (
                <MessageSquare aria-hidden="true" className="size-3.5" />
              ) : (
                <LockKeyhole aria-hidden="true" className="size-3.5" />
              )}
              Conversation {inquiry.lifecycle}
            </span>
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 pl-14 2xl:ml-auto 2xl:w-auto 2xl:pl-0">
          {inquiry.handlingStatus !== "spam" ? (
            <InquiryStatusMenu
              currentStatus={inquiry.handlingStatus}
              isDisabled={!inquiry.actions.canChangeHandlingStatus}
              isUpdating={isMutating}
              onStatusChange={(status) => void actions.onHandlingStatusChange(status)}
            />
          ) : null}
          <InquiryActionsMenu
            hasPendingReplyDraft={hasPendingReplyDraft}
            inquiry={inquiry}
            isMutating={isMutating}
            onLifecycleToggle={actions.onLifecycleToggle}
            onMarkReadToggle={actions.onMarkReadToggle}
            onSpamToggle={actions.onSpamToggle}
          />
        </div>
      </div>
    </header>
  )
}

function DetailSkeleton({ onBack }: Readonly<{ onBack: () => void }>) {
  return (
    <section
      aria-label="Loading inquiry"
      aria-busy="true"
      className="flex h-full min-h-0 flex-col bg-[var(--background)]"
    >
      <div className="flex items-center gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <Button
          aria-label="Back to inquiries"
          className="xl:hidden"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Button>
        <span className="size-12 animate-pulse rounded-full bg-[var(--surface)]" />
        <span className="min-w-0 flex-1 space-y-2">
          <span className="block h-5 w-44 max-w-full animate-pulse rounded-sm bg-[var(--surface)]" />
          <span className="block h-4 w-64 max-w-full animate-pulse rounded-sm bg-[var(--surface)]" />
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-hidden bg-[var(--canvas)] p-4 sm:p-6">
        <span className="mx-auto block h-4 w-28 animate-pulse rounded-sm bg-[var(--surface)]" />
        <span className="block h-28 animate-pulse rounded-xl bg-[var(--surface)]" />
        <span className="ml-auto block h-24 w-3/4 animate-pulse rounded-xl bg-[var(--surface)]" />
      </div>
      <p className="sr-only" role="status">
        Loading inquiry…
      </p>
    </section>
  )
}

function DetailFailure({
  actions,
  message,
  onBack,
}: Readonly<{ actions: InquiryWorkspaceActions; message: string; onBack: () => void }>) {
  return (
    <section aria-label="Inquiry loading failed" className="flex h-full min-h-0 flex-col bg-[var(--canvas)]">
      <div className="border-b border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
        <Button
          aria-label="Back to inquiries"
          className="xl:hidden"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 text-center shadow-sm"
          role="alert"
        >
          <CircleAlert aria-hidden="true" className="mx-auto size-8 text-[var(--destructive)]" />
          <h2 className="mt-4 text-lg font-bold text-[var(--secondary)]">Inquiry could not be loaded</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{message}</p>
          <Button className="mt-5" onClick={() => void actions.onRefresh()} variant="outline">
            <RefreshCw aria-hidden="true" className="size-4" /> Try again
          </Button>
        </div>
      </div>
    </section>
  )
}

function BlockedReplyRecovery({
  actions,
  model,
}: Readonly<{ actions: InquiryWorkspaceActions; model: InquiryWorkspaceViewModel }>) {
  const attachment = model.blockedReplyAttachment
  if (!model.blockedReplyDraft && !attachment) return null

  return (
    <section
      aria-labelledby="blocked-reply-recovery-heading"
      className="space-y-3 border-b border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_24%,var(--background))] px-4 py-3 sm:px-5"
    >
      <div>
        <h3 className="text-sm font-bold text-[var(--secondary)]" id="blocked-reply-recovery-heading">
          Unsent reply recovery
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
          The conversation no longer accepts replies. Keep the text as an internal note or discard the unbound
          attachment.
        </p>
      </div>
      {model.blockedReplyDraft ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs font-bold text-[var(--secondary)]">Reply text</p>
          <p className="mt-1 text-sm whitespace-pre-wrap text-[var(--foreground)]">
            {model.blockedReplyDraft}
          </p>
          <Button
            className="mt-3"
            disabled={!model.canConvertReplyDraftToNote || model.isMutating}
            onClick={() => actions.onReplyDraftConvertToNote()}
            size="small"
            variant="outline"
          >
            Move reply text to internal note
          </Button>
        </div>
      ) : null}
      {attachment ? (
        <div className="flex min-h-11 flex-wrap items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-xs">
          <FileText aria-hidden="true" className="size-4 shrink-0 text-[var(--primary)]" />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[var(--secondary)]">{attachment.fileName}</strong>
            <span className="block text-[var(--foreground)]">
              {attachment.status === "ready"
                ? `${attachment.mimeType} · ${formatInquiryAttachmentSize(attachment.sizeBytes)}`
                : attachment.status === "uploading"
                  ? "Upload in progress"
                  : "message" in attachment
                    ? attachment.message
                    : "Attachment preparation failed"}
            </span>
          </span>
          <Button
            aria-label={`Discard ${attachment.fileName}`}
            disabled={model.isMutating}
            onClick={() => void actions.onAttachmentRemove()}
            size="small"
            variant="outline"
          >
            Discard attachment
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function DetailPane({
  actions,
  headingRef,
  inquiry,
  model,
  onBack,
}: Readonly<{
  actions: InquiryWorkspaceActions
  headingRef: React.RefObject<HTMLHeadingElement | null>
  inquiry: PatientInquiryDetail
  model: InquiryWorkspaceViewModel
  onBack: () => void
}>) {
  return (
    <section
      aria-label={`Inquiry from ${inquiry.patient.name}`}
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--background)]"
    >
      <DetailHeader
        actions={actions}
        hasPendingReplyDraft={model.hasPendingReplyDraft}
        headingRef={headingRef}
        inquiry={inquiry}
        isMutating={model.isMutating}
        onBack={onBack}
      />
      <p aria-live="polite" className="sr-only" role="status">
        {model.statusMessage}
      </p>
      {model.detailError || model.mutationError || model.conflict ? (
        <div className="space-y-2 border-b border-[var(--border)] bg-[var(--background)] px-4 py-3 sm:px-5">
          {model.detailError ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[color-mix(in_srgb,var(--warning)_30%,var(--background))] px-3 py-2 text-sm"
              role="alert"
            >
              <span>{model.detailError}</span>
              <Button onClick={() => void actions.onRefresh()} size="small" variant="outline">
                Refresh
              </Button>
            </div>
          ) : null}
          {model.mutationError && !model.conflict ? (
            <p
              className="rounded-lg bg-[color-mix(in_srgb,var(--destructive)_9%,var(--background))] px-3 py-2 text-sm font-bold text-[var(--destructive)]"
              role="alert"
            >
              {model.mutationError} Your draft is still available; review the current state before trying
              again.
            </p>
          ) : null}
          {model.conflict ? (
            <div
              className="space-y-3 rounded-lg border border-[var(--warning)] px-3 py-2 text-sm"
              role="alert"
            >
              <p>{model.conflict.message} Your draft has been kept.</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={() => actions.onConflictDismiss()} size="small" variant="ghost">
                  Dismiss
                </Button>
                <Button onClick={() => void actions.onRefresh()} size="small" variant="outline">
                  Review current inquiry
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      <BlockedReplyRecovery actions={actions} model={model} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <InquiryContext actions={actions} inquiry={inquiry} isMutating={model.isMutating} />
        <InquiryTimeline attachmentAccessPaths={model.attachmentAccessPaths} inquiry={inquiry} />
        <InquiryComposer
          attachment={model.attachment}
          draft={model.draft}
          inquiry={inquiry}
          isMutating={model.isMutating}
          mode={model.activeComposerMode}
          onAttachmentRemove={actions.onAttachmentRemove}
          onAttachmentRetry={actions.onAttachmentRetry}
          onAttachmentSelect={actions.onAttachmentSelect}
          onDraftChange={actions.onDraftChange}
          onModeChange={actions.onComposerModeChange}
          onSend={actions.onSend}
          statusMessage={model.statusMessage}
        />
      </div>
      <InquiryContactReauthenticationDialog
        isMutating={model.isMutating}
        onConfirm={actions.onContactReauthenticate}
        onDismiss={actions.onContactReauthenticationDismiss}
        reauthentication={model.contactReauthentication}
      />
    </section>
  )
}

export function InquiryQueueScreen({
  actions,
  focusHeading,
  focusInquiryId,
  model,
  onFocusHandled,
}: InquiryQueueScreenProps) {
  const inquiryRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const listHeadingRef = useRef<HTMLHeadingElement>(null)
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!focusHeading && (!focusInquiryId || focusInquiryId !== model.selectedInquiry?.id)) return

    const frame = requestAnimationFrame(() => {
      if (focusHeading) listHeadingRef.current?.focus()
      else detailHeadingRef.current?.focus()
      onFocusHandled?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [focusHeading, focusInquiryId, model.selectedInquiry?.id, onFocusHandled])

  const returnToInquiryList = () => {
    const inquiryId = model.selectedInquiryId
    actions.onMobileBack()
    requestAnimationFrame(() => {
      const inquiryItem = inquiryId ? inquiryRefs.current[inquiryId] : undefined
      const focusTarget = inquiryItem ?? listHeadingRef.current
      focusTarget?.focus()
    })
  }

  const showMobileDetail = model.mobileDetailOpen

  return (
    <div className="grid h-[calc(100dvh-4rem)] min-h-[40rem] overflow-hidden bg-[var(--background)] xl:grid-cols-[20.5rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]">
      <QueuePane actions={actions} headingRef={listHeadingRef} inquiryRefs={inquiryRefs} model={model} />
      <div className={cn("h-full min-h-0 min-w-0", !showMobileDetail && "max-xl:hidden")}>
        {model.detailStatus === "loading" ? (
          <DetailSkeleton onBack={returnToInquiryList} />
        ) : model.selectedInquiry ? (
          <DetailPane
            actions={actions}
            headingRef={detailHeadingRef}
            inquiry={model.selectedInquiry}
            model={model}
            onBack={returnToInquiryList}
          />
        ) : model.detailError && model.selectedInquiryId ? (
          <DetailFailure actions={actions} message={model.detailError} onBack={returnToInquiryList} />
        ) : (
          <section
            aria-label="Inquiry details"
            className="flex h-full items-center justify-center bg-[var(--canvas)] p-8"
          >
            <div className="max-w-sm text-center">
              <MessageSquare aria-hidden="true" className="mx-auto size-8 text-[var(--primary)]" />
              <h2 className="mt-4 text-lg font-bold text-[var(--secondary)]">Select an inquiry</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                Open an inquiry to review its conversation, internal notes and working context.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
