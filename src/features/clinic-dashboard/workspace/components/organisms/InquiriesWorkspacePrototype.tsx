"use client"

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
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react"
import { useMemo, useState, type ChangeEvent, type ReactNode } from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ClinicDashboardShell } from "../../ClinicDashboardShell"
import { AccountMenu } from "../molecules/AccountMenu"
import { ClinicLocationSelector } from "../molecules/ClinicLocationSelector"
import type { ClinicDashboardSection } from "../../model/workspace"
import type { ClinicDashboardNavigationItem } from "../../navigation"

type InquiryFilter = "all" | "closed" | "open" | "spam" | "unread"
type InquiryLifecycle = "closed" | "open"
type InquiryStatus = "contacted" | "in_review" | "spam" | "submitted"
type ComposerMode = "note" | "reply"

type TimelineEntry = Readonly<{
  attachment?: string
  author?: string
  body: string
  id: string
  kind: "clinic" | "event" | "note" | "patient"
  time: string
}>

type PrototypeInquiry = Readonly<{
  contact?: Readonly<{ email: string; phone: string }>
  contactWindow: string
  guest: boolean
  id: string
  initials: string
  interest: string
  lifecycle: InquiryLifecycle
  name: string
  received: string
  status: InquiryStatus
  timeline: readonly TimelineEntry[]
  treatmentTimeline: string
  unread: number
}>

const prototypeNavigationItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "messages", label: "Inquiries (3)" },
  { id: "reviews", label: "Reviews" },
  { id: "profile", label: "Clinic profile" },
] as const satisfies readonly ClinicDashboardNavigationItem[]

const prototypeLocations = [
  {
    id: "berlin-mitte",
    location: "Mitte, Berlin",
    name: "Berlin Health Clinic — Mitte",
    selectorLabel: "Mitte",
  },
  {
    id: "berlin-charlottenburg",
    location: "Charlottenburg, Berlin",
    name: "Berlin Health Clinic — Charlottenburg",
    selectorLabel: "Charlottenburg",
  },
] as const

const initialInquiries: readonly PrototypeInquiry[] = [
  {
    contact: { email: "l.weber@example.com", phone: "+49 30 555 01 28" },
    contactWindow: "Weekdays after 16:00",
    guest: false,
    id: "lukas-weber",
    initials: "LW",
    interest: "Hair transplant",
    lifecycle: "open",
    name: "Lukas Weber",
    received: "11:02",
    status: "contacted",
    treatmentTimeline: "Within 3–6 months",
    unread: 2,
    timeline: [
      {
        body: "I am interested in a hair transplant and would like to know which documents I should prepare for an initial consultation.",
        id: "lukas-inquiry",
        kind: "patient",
        time: "10:45",
      },
      {
        author: "Sarah Schmidt",
        body: "Patient prefers a first assessment by message before scheduling a call.",
        id: "lukas-note",
        kind: "note",
        time: "10:49",
      },
      {
        author: "Dr Anna Keller",
        body: "Hello Mr Weber, thank you for your interest. For an initial assessment we normally need photos of the affected areas.",
        id: "lukas-clinic",
        kind: "clinic",
        time: "10:52",
      },
      {
        attachment: "assessment-photos.pdf · 703 KB",
        body: "Here are the requested photos. I hope they help with the initial assessment.",
        id: "lukas-patient-file",
        kind: "patient",
        time: "11:02",
      },
    ],
  },
  {
    contactWindow: "Mornings",
    guest: true,
    id: "aylin-kaya",
    initials: "AK",
    interest: "Dental veneers and full smile reconstruction",
    lifecycle: "open",
    name: "Aylin Kaya",
    received: "10:12",
    status: "submitted",
    treatmentTimeline: "Within one month",
    unread: 1,
    timeline: [
      {
        body: "I would like to understand the consultation process for dental veneers and whether an initial estimate is possible.",
        id: "aylin-inquiry",
        kind: "patient",
        time: "10:12",
      },
      {
        author: "Sarah Schmidt",
        body: "Guest inquiry. Review treatment fit now; wait for verified patient access before replying.",
        id: "aylin-note",
        kind: "note",
        time: "10:18",
      },
    ],
  },
  {
    contact: { email: "s.meyer@example.com", phone: "+49 30 555 01 84" },
    contactWindow: "Thursday afternoon",
    guest: false,
    id: "sarah-meyer",
    initials: "SM",
    interest: "Skin analysis",
    lifecycle: "open",
    name: "Sarah Meyer",
    received: "Yesterday",
    status: "in_review",
    treatmentTimeline: "Flexible",
    unread: 0,
    timeline: [
      {
        body: "I have recurring irritation and would like to know whether a digital first assessment makes sense.",
        id: "sarah-inquiry",
        kind: "patient",
        time: "Yesterday, 16:30",
      },
      {
        body: "Status changed from Submitted to In review.",
        id: "sarah-event",
        kind: "event",
        time: "Yesterday, 16:42",
      },
    ],
  },
  {
    contact: { email: "m.schmidt@example.com", phone: "+49 30 555 01 49" },
    contactWindow: "Any weekday",
    guest: false,
    id: "markus-schmidt",
    initials: "MS",
    interest: "Rhinoplasty",
    lifecycle: "closed",
    name: "Markus Schmidt",
    received: "Monday",
    status: "contacted",
    treatmentTimeline: "Within 6 months",
    unread: 0,
    timeline: [
      {
        body: "Could you tell me whether a consultation can be held remotely before I travel?",
        id: "markus-inquiry",
        kind: "patient",
        time: "Monday, 09:20",
      },
      {
        author: "Sarah Schmidt",
        body: "Closed after the patient confirmed that another clinic was selected.",
        id: "markus-note",
        kind: "note",
        time: "Monday, 15:06",
      },
      {
        body: "Conversation closed by Sarah Schmidt.",
        id: "markus-event",
        kind: "event",
        time: "Monday, 15:07",
      },
    ],
  },
  {
    contact: { email: "masked@example.com", phone: "+49 30 555 09 99" },
    contactWindow: "Unknown",
    guest: true,
    id: "spam-sender",
    initials: "?",
    interest: "Unrelated promotion",
    lifecycle: "closed",
    name: "Unknown sender",
    received: "8 Aug",
    status: "spam",
    treatmentTimeline: "Not applicable",
    unread: 0,
    timeline: [
      {
        body: "Promotional content unrelated to patient care.",
        id: "spam-inquiry",
        kind: "patient",
        time: "8 Aug, 08:11",
      },
      {
        author: "Sarah Schmidt",
        body: "Marked as spam because the content promotes an unrelated commercial service.",
        id: "spam-note",
        kind: "note",
        time: "8 Aug, 08:14",
      },
      {
        body: "Marked as Spam and conversation closed.",
        id: "spam-event",
        kind: "event",
        time: "8 Aug, 08:14",
      },
    ],
  },
]

const statusLabels: Record<InquiryStatus, string> = {
  contacted: "Contacted",
  in_review: "In review",
  spam: "Spam",
  submitted: "Submitted",
}

const messageCharacterLimit = 3000

function getPrototypeTarget() {
  return window.parent === window ? window : window.parent
}

function SelectField({
  ariaLabel,
  children,
  className,
  onValueChange,
  value,
  wrapperClassName,
}: Readonly<{
  ariaLabel: string
  children: ReactNode
  className?: string
  onValueChange: (value: string) => void
  value: string
  wrapperClassName?: string
}>) {
  return (
    <span className={cn("relative inline-flex", wrapperClassName)}>
      <Select
        aria-label={ariaLabel}
        className={cn("appearance-none pr-10", className)}
        onValueChange={onValueChange}
        value={value}
      >
        {children}
      </Select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--secondary)]"
        strokeWidth={2.5}
      />
    </span>
  )
}

function getInitialInquiryId() {
  if (typeof window === "undefined") return undefined
  return new URL(getPrototypeTarget().location.href).searchParams.get("inquiry") ?? undefined
}

function StatusLabel({ inquiry }: Readonly<{ inquiry: PrototypeInquiry }>) {
  if (inquiry.status === "spam") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--destructive)_12%,var(--background))] px-2 py-1 text-xs font-bold text-[var(--destructive)]">
        <ShieldAlert aria-hidden="true" className="size-3.5" /> Spam
      </span>
    )
  }
  if (inquiry.lifecycle === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs font-bold text-[var(--foreground)]">
        <LockKeyhole aria-hidden="true" className="size-3.5" /> Closed
      </span>
    )
  }
  return <span className="text-xs font-bold text-[var(--foreground)]">{statusLabels[inquiry.status]}</span>
}

function GuestLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] font-bold text-[var(--foreground)]">
      <UserRound aria-hidden="true" className="size-3.5" /> Guest inquiry · No chat
    </span>
  )
}

function InquiryList({
  inquiries,
  onSelect,
  selectedId,
}: Readonly<{
  inquiries: readonly PrototypeInquiry[]
  onSelect: (id: string) => void
  selectedId?: string
}>) {
  if (inquiries.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-[var(--foreground)]">No inquiries match these filters.</p>
    )
  }

  return (
    <ul aria-label="Inquiries" className="divide-y divide-[var(--border)]">
      {inquiries.map((inquiry) => (
        <li key={inquiry.id}>
          <button
            aria-current={selectedId === inquiry.id ? "true" : undefined}
            className={cn(
              "w-full border-l-4 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]",
              selectedId === inquiry.id
                ? "border-l-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-l-transparent bg-[var(--background)]",
            )}
            onClick={() => onSelect(inquiry.id)}
            type="button"
          >
            <div className="flex items-start gap-3">
              <Avatar className="size-9" initials={inquiry.initials} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm text-[var(--secondary)]">{inquiry.name}</strong>
                  <span className="shrink-0 text-[11px] text-[var(--foreground)]">{inquiry.received}</span>
                </span>
                <span className="mt-1 block truncate text-xs font-bold text-[var(--foreground)]">
                  {inquiry.interest}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 break-words text-[var(--foreground)] sm:line-clamp-1">
                  {inquiry.timeline.at(-1)?.body}
                </span>
                <span className="mt-2 flex min-h-5 flex-wrap items-center gap-2">
                  {inquiry.status === "spam" ? (
                    <StatusLabel inquiry={inquiry} />
                  ) : inquiry.guest ? (
                    <GuestLabel />
                  ) : (
                    <StatusLabel inquiry={inquiry} />
                  )}
                  {inquiry.unread > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--on-primary)]">
                      {inquiry.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Timeline({
  constrainWidth,
  inquiry,
}: Readonly<{ constrainWidth: boolean; inquiry: PrototypeInquiry }>) {
  return (
    <div
      aria-label={`Activity for ${inquiry.name}`}
      className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas)] p-4 sm:p-6"
      role="log"
    >
      <div className={cn("space-y-5", constrainWidth && "mx-auto w-full max-w-[68rem]")}>
        <div className="flex items-center gap-3" role="separator">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
            Latest activity
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {inquiry.timeline.map((entry) => {
          if (entry.kind === "event") {
            return (
              <div className="flex items-center gap-3" key={entry.id}>
                <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
                <p className="flex max-w-[80%] items-center gap-2 rounded-md bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
                  <Clock3 aria-hidden="true" className="size-3.5 shrink-0" /> {entry.body} · {entry.time}
                </p>
                <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
              </div>
            )
          }

          if (entry.kind === "note") {
            return (
              <div
                className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_65%,var(--border))] bg-[color-mix(in_srgb,var(--warning)_35%,var(--background))] p-4"
                key={entry.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="flex items-center gap-2 text-xs text-[var(--secondary)]">
                    <LockKeyhole aria-hidden="true" className="size-3.5" /> Internal note · Clinic only
                  </strong>
                  <span className="text-xs text-[var(--foreground)]">
                    {entry.author} · {entry.time}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--secondary)]">{entry.body}</p>
              </div>
            )
          }

          const clinic = entry.kind === "clinic"
          return (
            <div className={cn("flex", clinic && "justify-end")} key={entry.id}>
              <div className={cn("max-w-[88%] sm:max-w-[72%]", clinic && "text-right")}>
                <div
                  className={cn(
                    "rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left text-sm leading-6 shadow-sm",
                    clinic && "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]",
                  )}
                >
                  <p>{entry.body}</p>
                  {entry.attachment ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface)] p-3 text-[var(--secondary)]">
                      <FileText aria-hidden="true" className="size-5" />
                      <span className="min-w-0 truncate text-xs font-bold">{entry.attachment}</span>
                    </div>
                  ) : null}
                </div>
                <span className="mt-1 block text-xs text-[var(--foreground)]">
                  {clinic ? `${entry.author ?? "Clinic team"} · ` : "Patient · "}
                  {entry.time}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Composer({
  attachment,
  constrainWidth,
  drafts,
  inquiry,
  mode,
  onAttachmentChange,
  onDraftChange,
  onModeChange,
  onSend,
}: Readonly<{
  attachment?: string
  constrainWidth: boolean
  drafts: Readonly<Record<string, string>>
  inquiry: PrototypeInquiry
  mode: ComposerMode
  onAttachmentChange: (name?: string) => void
  onDraftChange: (value: string) => void
  onModeChange: (mode: ComposerMode) => void
  onSend: () => void
}>) {
  const canReply = !inquiry.guest && inquiry.lifecycle === "open" && inquiry.status !== "spam"
  const draftKey = `${inquiry.id}:${mode}`
  const draft = drafts[draftKey] ?? ""
  const isOverLimit = draft.length > messageCharacterLimit
  const characterStatusId = `${inquiry.id}-${mode}-character-status`
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    onAttachmentChange(event.target.files?.[0]?.name)
    event.target.value = ""
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)] p-3 shadow-sm sm:p-4">
      <div className={cn(constrainWidth && "mx-auto w-full max-w-[68rem]")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-[var(--surface)] p-1">
            {canReply ? (
              <button
                aria-pressed={mode === "reply"}
                className={cn(
                  "min-h-10 rounded-md px-3 text-xs font-bold",
                  mode === "reply"
                    ? "bg-[var(--background)] text-[var(--secondary)] shadow-sm"
                    : "text-[var(--foreground)]",
                )}
                onClick={() => onModeChange("reply")}
                type="button"
              >
                Reply to patient
              </button>
            ) : null}
            <button
              aria-pressed={mode === "note"}
              className={cn(
                "min-h-10 rounded-md px-3 text-xs font-bold",
                mode === "note"
                  ? "bg-[var(--background)] text-[var(--secondary)] shadow-sm"
                  : "text-[var(--foreground)]",
              )}
              onClick={() => onModeChange("note")}
              type="button"
            >
              Internal note
            </button>
          </div>
          <span className="hidden text-xs text-[var(--foreground)] sm:block">
            {mode === "note" ? "Clinic only · No patient notification" : "Sent through findmydoc"}
          </span>
        </div>
        {!canReply ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--foreground)]">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {inquiry.status === "spam"
                ? "External messaging is blocked while this inquiry is marked as spam."
                : inquiry.guest
                  ? "No patient chat yet. This inquiry is not linked to a verified patient account."
                  : "The conversation is closed. Internal notes remain available."}
            </span>
          </div>
        ) : null}
        <Textarea
          aria-describedby={characterStatusId}
          aria-invalid={isOverLimit || undefined}
          aria-label={mode === "note" ? "Internal note" : "Reply to patient"}
          className={cn(
            "min-h-24 resize-none text-sm",
            isOverLimit &&
              "border-[var(--destructive)] focus-visible:border-[var(--destructive)] focus-visible:outline-[var(--destructive)]",
          )}
          onValueChange={onDraftChange}
          placeholder={mode === "note" ? "Add clinic-only context…" : "Write a reply…"}
          value={draft}
        />
        {isOverLimit ? (
          <p
            className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--destructive)]"
            id={characterStatusId}
            role="alert"
          >
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            Shorten by {draft.length - messageCharacterLimit} characters before sending.
          </p>
        ) : (
          <span className="sr-only" id={characterStatusId}>
            {messageCharacterLimit - draft.length} characters remaining.
          </span>
        )}
        {attachment ? (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 font-bold text-[var(--secondary)]">
              <Paperclip aria-hidden="true" className="size-4" />{" "}
              <span className="truncate">{attachment}</span>
            </span>
            <button
              className="text-[var(--primary)]"
              onClick={() => onAttachmentChange(undefined)}
              type="button"
            >
              Remove
            </button>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label
              className={cn(
                "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-bold",
                mode === "note" && "cursor-not-allowed opacity-45",
              )}
            >
              <Paperclip aria-hidden="true" className="size-4" /> Attach
              <input
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                className="sr-only"
                disabled={mode === "note"}
                onChange={handleFile}
                type="file"
              />
            </label>
            <span
              className={cn(
                "text-[11px] text-[var(--foreground)] tabular-nums",
                isOverLimit && "font-bold text-[var(--destructive)]",
              )}
            >
              {draft.length.toLocaleString("en-US")} / {messageCharacterLimit.toLocaleString("en-US")}
            </span>
          </div>
          <Button disabled={isOverLimit || (!draft.trim() && !attachment)} onClick={onSend}>
            <Send aria-hidden="true" className="size-4" /> {mode === "note" ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function InquiryHeader({
  inquiry,
  onBack,
  onClose,
  onMarkUnread,
  onSpamToggle,
  onStatusChange,
}: Readonly<{
  inquiry: PrototypeInquiry
  onBack: () => void
  onClose: () => void
  onMarkUnread: () => void
  onSpamToggle: () => void
  onStatusChange: (status: InquiryStatus) => void
}>) {
  const [actionsOpen, setActionsOpen] = useState(false)

  return (
    <header className="border-b border-[var(--border)] bg-[var(--background)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <Button
          aria-label="Back to inquiries"
          className="lg:hidden"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Button>
        <Avatar className="size-12" initials={inquiry.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg leading-6 font-bold break-words text-[var(--secondary)] sm:text-xl">
              {inquiry.name}
            </h2>
            {inquiry.status === "spam" ? (
              <StatusLabel inquiry={inquiry} />
            ) : inquiry.guest ? (
              <GuestLabel />
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--foreground)]">
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
        <div className="flex w-full flex-wrap items-center gap-2 pl-[3.75rem] xl:ml-auto xl:w-auto xl:pl-0">
          {inquiry.status !== "spam" ? (
            <SelectField
              ariaLabel="Inquiry status"
              className="min-h-10 min-w-32 text-sm"
              onValueChange={(value) => onStatusChange(value as InquiryStatus)}
              value={inquiry.status}
              wrapperClassName="w-fit"
            >
              <option value="submitted">Submitted</option>
              <option value="in_review">In review</option>
              <option value="contacted">Contacted</option>
            </SelectField>
          ) : null}
          <DropdownMenu onOpenChange={setActionsOpen} open={actionsOpen}>
            <DropdownMenu.Trigger asChild>
              <Button aria-label="More actions" size="icon" variant="outline">
                <MoreHorizontal aria-hidden="true" className="size-5" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" className="w-64">
              <DropdownMenu.Item disabled={inquiry.status === "spam"} onSelect={onClose}>
                <LockKeyhole aria-hidden="true" className="size-4" />
                {inquiry.status === "spam"
                  ? "Conversation locked while spam"
                  : inquiry.lifecycle === "open"
                    ? "Close conversation"
                    : "Reopen conversation"}
              </DropdownMenu.Item>
              <DropdownMenu.Item onSelect={onMarkUnread}>
                <Mail aria-hidden="true" className="size-4" />
                Mark {inquiry.unread > 0 ? "as read" : "as unread"}
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={onSpamToggle} variant="destructive">
                <ShieldAlert aria-hidden="true" className="size-4" />
                {inquiry.status === "spam" ? "Remove spam label" : "Mark as spam"}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

function InquiryContext({
  constrainWidth,
  inquiry,
}: Readonly<{ constrainWidth: boolean; inquiry: PrototypeInquiry }>) {
  const [contactVisible, setContactVisible] = useState(false)
  const content = (
    <>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--background)] text-[var(--secondary)]">
            <CalendarClock aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
              Treatment timeline
            </dt>
            <dd className="mt-1 text-sm font-bold break-words text-[var(--secondary)]">
              {inquiry.treatmentTimeline}
            </dd>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--background)] text-[var(--secondary)]">
            <Clock3 aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
              Preferred contact time
            </dt>
            <dd className="mt-1 text-sm font-bold break-words text-[var(--secondary)]">
              {inquiry.contactWindow}
            </dd>
          </div>
        </div>
      </dl>
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3">
        <button
          aria-expanded={contactVisible}
          className="flex min-h-8 w-full items-center justify-between gap-3 text-left text-xs font-bold text-[var(--secondary)]"
          onClick={() => setContactVisible((current) => !current)}
          type="button"
        >
          {inquiry.status === "spam" ? "Protected contact details" : "Contact details"}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform", contactVisible && "rotate-180")}
          />
        </button>
        {contactVisible ? (
          inquiry.contact ? (
            <div className="mt-3 space-y-2 text-sm text-[var(--foreground)]">
              <p className="flex items-center gap-2">
                <Mail aria-hidden="true" className="size-4" /> {inquiry.contact.email}
              </p>
              <p className="flex items-center gap-2">
                <Phone aria-hidden="true" className="size-4" /> {inquiry.contact.phone}
              </p>
              <p className="text-xs leading-5">
                Read-only. Off-platform contact is not added to the conversation automatically.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-[var(--foreground)]">
              No verified contact details are available for this guest inquiry.
            </p>
          )
        ) : null}
      </div>
    </>
  )

  return (
    <details className="group border-b border-[var(--border)] bg-[var(--background)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[var(--secondary)] sm:px-5">
        Inquiry details
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          strokeWidth={2.5}
        />
      </summary>
      <div className="border-t border-[var(--border)] px-4 py-4 sm:px-5">
        <div className={cn(constrainWidth && "mx-auto w-full max-w-[68rem]")}>{content}</div>
      </div>
    </details>
  )
}

function Filters({
  filter,
  onFilterChange,
  onSearchChange,
  onStatusFilterChange,
  search,
  statusFilter,
}: Readonly<{
  filter: InquiryFilter
  onFilterChange: (filter: InquiryFilter) => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  search: string
  statusFilter: string
}>) {
  const filters: readonly InquiryFilter[] = ["open", "unread", "closed", "spam", "all"]
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
          onValueChange={onSearchChange}
          placeholder="Search inquiries…"
          type="search"
          value={search}
        />
      </label>
      <div className="flex flex-wrap gap-1">
        {filters.map((item) => (
          <button
            aria-pressed={filter === item}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-bold capitalize",
              filter === item
                ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "text-[var(--foreground)] hover:bg-[var(--surface)]",
            )}
            key={item}
            onClick={() => onFilterChange(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <SelectField
        ariaLabel="Filter by status"
        className="text-sm"
        onValueChange={onStatusFilterChange}
        value={statusFilter}
        wrapperClassName="w-full"
      >
        <option value="all">All statuses</option>
        <option value="submitted">Submitted</option>
        <option value="in_review">In review</option>
        <option value="contacted">Contacted</option>
      </SelectField>
    </div>
  )
}

function DetailPane({
  attachment,
  constrainWidth,
  drafts,
  inquiry,
  mode,
  onAttachmentChange,
  onBack,
  onClose,
  onDraftChange,
  onMarkUnread,
  onModeChange,
  onSend,
  onSpamToggle,
  onStatusChange,
}: Readonly<{
  attachment?: string
  constrainWidth: boolean
  drafts: Readonly<Record<string, string>>
  inquiry: PrototypeInquiry
  mode: ComposerMode
  onAttachmentChange: (name?: string) => void
  onBack: () => void
  onClose: () => void
  onDraftChange: (value: string) => void
  onMarkUnread: () => void
  onModeChange: (mode: ComposerMode) => void
  onSend: () => void
  onSpamToggle: () => void
  onStatusChange: (status: InquiryStatus) => void
}>) {
  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--background)]"
      aria-label={`Inquiry from ${inquiry.name}`}
    >
      <InquiryHeader
        inquiry={inquiry}
        onBack={onBack}
        onClose={onClose}
        onMarkUnread={onMarkUnread}
        onSpamToggle={onSpamToggle}
        onStatusChange={onStatusChange}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <InquiryContext constrainWidth={constrainWidth} inquiry={inquiry} />
        <Timeline constrainWidth={constrainWidth} inquiry={inquiry} />
        <Composer
          attachment={attachment}
          constrainWidth={constrainWidth}
          drafts={drafts}
          inquiry={inquiry}
          mode={mode}
          onAttachmentChange={onAttachmentChange}
          onDraftChange={onDraftChange}
          onModeChange={onModeChange}
          onSend={onSend}
        />
      </div>
    </section>
  )
}

export function InquiriesWorkspacePrototype() {
  const [activeSection, setActiveSection] = useState<ClinicDashboardSection>("messages")
  const [locationId, setLocationId] = useState("berlin-mitte")
  const [inquiries, setInquiries] = useState(initialInquiries)
  const [selectedId, setSelectedId] = useState<string | undefined>(getInitialInquiryId)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(() => Boolean(getInitialInquiryId()))
  const [filter, setFilter] = useState<InquiryFilter>("open")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [composerMode, setComposerMode] = useState<ComposerMode>("reply")
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({})
  const [attachments, setAttachments] = useState<Readonly<Record<string, string | undefined>>>({})

  const selected = inquiries.find(({ id }) => id === selectedId)
  const canReply = Boolean(
    selected && !selected.guest && selected.lifecycle === "open" && selected.status !== "spam",
  )
  const effectiveComposerMode = canReply ? composerMode : "note"

  const visibleInquiries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("en")
    return inquiries.filter((inquiry) => {
      const filterMatch =
        filter === "all" ||
        (filter === "open" && inquiry.lifecycle === "open" && inquiry.status !== "spam") ||
        (filter === "closed" && inquiry.lifecycle === "closed" && inquiry.status !== "spam") ||
        (filter === "spam" && inquiry.status === "spam") ||
        (filter === "unread" && inquiry.unread > 0)
      const statusMatch = statusFilter === "all" || inquiry.status === statusFilter
      const searchMatch =
        !query ||
        [
          inquiry.name,
          inquiry.id,
          inquiry.interest,
          ...inquiry.timeline.map(({ attachment, body }) => `${body} ${attachment ?? ""}`),
        ]
          .join(" ")
          .toLocaleLowerCase("en")
          .includes(query)
      return filterMatch && statusMatch && searchMatch
    })
  }, [filter, inquiries, search, statusFilter])

  const updateSelected = (updater: (inquiry: PrototypeInquiry) => PrototypeInquiry) => {
    if (!selected) return
    setInquiries((current) =>
      current.map((inquiry) => (inquiry.id === selected.id ? updater(inquiry) : inquiry)),
    )
  }
  const selectInquiry = (id: string) => {
    setSelectedId(id)
    setMobileDetailOpen(true)
    const next = inquiries.find((inquiry) => inquiry.id === id)
    if (next && !next.guest && next.lifecycle === "open" && next.status !== "spam") setComposerMode("reply")
    else setComposerMode("note")
  }
  const send = () => {
    if (!selected) return
    const key = `${selected.id}:${effectiveComposerMode}`
    const draft = drafts[key] ?? ""
    const body = draft.trim()
    const attachment = attachments[selected.id]
    if (draft.length > messageCharacterLimit || (!body && !attachment)) return
    const entry: TimelineEntry = {
      ...(attachment ? { attachment: `${attachment} · Ready` } : {}),
      author: "Sarah Schmidt",
      body,
      id: `${selected.id}-${effectiveComposerMode}-${selected.timeline.length + 1}`,
      kind: effectiveComposerMode === "note" ? "note" : "clinic",
      time: "Just now",
    }
    updateSelected((inquiry) => ({
      ...inquiry,
      status:
        effectiveComposerMode === "reply" &&
        (inquiry.status === "submitted" || inquiry.status === "in_review")
          ? "contacted"
          : inquiry.status,
      timeline: [...inquiry.timeline, entry],
    }))
    setDrafts((current) => ({ ...current, [key]: "" }))
    setAttachments((current) => ({ ...current, [selected.id]: undefined }))
  }

  const detailProps = selected
    ? {
        attachment: attachments[selected.id],
        constrainWidth: true,
        drafts,
        inquiry: selected,
        mode: effectiveComposerMode,
        onAttachmentChange: (name?: string) =>
          setAttachments((current) => ({ ...current, [selected.id]: name })),
        onBack: () => setMobileDetailOpen(false),
        onClose: () =>
          updateSelected((inquiry) => ({
            ...inquiry,
            lifecycle: inquiry.lifecycle === "open" ? "closed" : "open",
          })),
        onDraftChange: (value: string) =>
          setDrafts((current) => ({ ...current, [`${selected.id}:${effectiveComposerMode}`]: value })),
        onMarkUnread: () => updateSelected((inquiry) => ({ ...inquiry, unread: inquiry.unread > 0 ? 0 : 1 })),
        onModeChange: setComposerMode,
        onSend: send,
        onSpamToggle: () =>
          updateSelected((inquiry) => ({
            ...inquiry,
            lifecycle: "closed",
            status: inquiry.status === "spam" ? "submitted" : "spam",
            timeline: [
              ...inquiry.timeline,
              {
                body:
                  inquiry.status === "spam"
                    ? "Spam label removed. Conversation remains closed."
                    : "Marked as Spam and conversation closed.",
                id: `${inquiry.id}-spam-${inquiry.timeline.length}`,
                kind: "event" as const,
                time: "Just now",
              },
            ],
            unread: inquiry.status === "spam" ? inquiry.unread : 0,
          })),
        onStatusChange: (status: InquiryStatus) => updateSelected((inquiry) => ({ ...inquiry, status })),
      }
    : undefined

  const filters = (
    <Filters
      filter={filter}
      onFilterChange={setFilter}
      onSearchChange={setSearch}
      onStatusFilterChange={setStatusFilter}
      search={search}
      statusFilter={statusFilter}
    />
  )

  const unreadCount = inquiries.reduce((total, inquiry) => total + inquiry.unread, 0)
  const navigationItems = prototypeNavigationItems.map((item) =>
    item.id === "messages" ? { ...item, label: `Inquiries (${unreadCount})` } : item,
  )
  const workspace = (
    <div className="-mx-4 -my-4 grid h-[calc(100dvh-4rem)] min-h-[40rem] overflow-hidden bg-[var(--background)] sm:-mx-6 sm:-my-6 md:relative md:left-1/2 md:mx-0 md:w-[calc(100vw-16rem)] md:-translate-x-1/2 lg:-my-7 lg:grid-cols-[20.5rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
      <section
        className={cn(
          "flex min-h-0 flex-col border-r border-[var(--border)]",
          mobileDetailOpen && "max-lg:hidden",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--secondary)]">Inquiries</h1>
            <p className="mt-1 text-xs text-[var(--foreground)]">Shared clinic workspace</p>
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[var(--primary)] px-2 py-1 text-xs font-bold text-[var(--on-primary)]">
              {unreadCount} unread
            </span>
          ) : null}
        </div>
        {filters}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <InquiryList inquiries={visibleInquiries} onSelect={selectInquiry} selectedId={selectedId} />
        </div>
      </section>
      <div className={cn("h-full min-h-0", !mobileDetailOpen && "max-lg:hidden")}>
        {selected && detailProps ? (
          <DetailPane {...detailProps} />
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

  return (
    <ClinicDashboardShell
      accountMenu={
        <AccountMenu
          email="sarah.schmidt@example.com"
          initials="SS"
          name="Sarah Schmidt"
          role="Clinic administrator"
        />
      }
      activeSection={activeSection}
      clinicIdentity={
        <ClinicLocationSelector
          canSwitchLocations
          isDemoData
          locations={prototypeLocations}
          onValueChange={setLocationId}
          organizationName="Berlin Health Group"
          value={locationId}
        />
      }
      environmentBadge="Prototype"
      items={navigationItems}
      onSectionSelect={setActiveSection}
    >
      {activeSection === "messages" ? (
        workspace
      ) : (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-8 text-center">
          <CircleAlert aria-hidden="true" className="mx-auto size-8 text-[var(--primary)]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--secondary)]">Outside prototype scope</h1>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            This throwaway prototype only changes the Inquiries workspace.
          </p>
          <Button className="mt-5" onClick={() => setActiveSection("messages")}>
            <MessageSquare aria-hidden="true" className="size-4" /> Return to Inquiries
          </Button>
        </section>
      )}
    </ClinicDashboardShell>
  )
}
