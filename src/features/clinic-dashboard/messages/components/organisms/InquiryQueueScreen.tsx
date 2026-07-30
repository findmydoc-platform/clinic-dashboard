"use client"

import { useEffect, useRef } from "react"
import { ArrowLeft, Clock3, Mail, MapPin, Phone, Search, UserRound } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { InquiryListItem } from "../molecules/InquiryListItem"
import { InquiryStatusMenu } from "../molecules/InquiryStatusMenu"
import {
  getPatientInquiryStatusLabel,
  type InquiryQueueActions,
  type InquiryQueueViewModel,
} from "../../model/inquiries"

type InquiryQueueScreenProps = Readonly<{
  actions: InquiryQueueActions
  focusHeading?: boolean
  focusInquiryId?: string
  model: InquiryQueueViewModel
  onFocusHandled?: () => void
}>

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
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
  const mobileHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!focusHeading && (!focusInquiryId || focusInquiryId !== model.selectedInquiry?.id)) return

    const frame = requestAnimationFrame(() => {
      if (focusHeading) {
        listHeadingRef.current?.focus()
      } else {
        mobileHeadingRef.current?.focus()
      }
      onFocusHandled?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [focusHeading, focusInquiryId, model.selectedInquiry?.id, onFocusHandled])

  const returnToInquiryList = () => {
    const inquiryId = model.selectedInquiry?.id
    actions.onMobileBack()
    requestAnimationFrame(() => {
      if (inquiryId) inquiryRefs.current[inquiryId]?.focus()
    })
  }

  return (
    <div className="grid h-[calc(100dvh-7rem)] min-h-[36rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm lg:grid-cols-[23.5rem_minmax(0,1fr)]">
      <section
        aria-labelledby="inquiry-list-heading"
        className={cn(
          "min-h-0 min-w-0 overflow-y-auto border-b border-[var(--border)] lg:block lg:border-r lg:border-b-0",
          model.mobileInquiryOpen && "max-lg:hidden",
        )}
      >
        <div className="space-y-4 border-b border-[var(--border)] p-4 sm:px-5 sm:py-8">
          <div className="flex items-center justify-between gap-3">
            <h1
              className="text-xl font-bold text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              id="inquiry-list-heading"
              ref={listHeadingRef}
              tabIndex={-1}
            >
              Messages
            </h1>
            {model.newInquiryCount > 0 ? (
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-[var(--accent-foreground)]">
                {model.newInquiryCount} new
              </span>
            ) : (
              <span className="text-xs font-bold text-[var(--foreground)]">Up to date</span>
            )}
          </div>
          <label className="relative block">
            <span className="sr-only">Search inquiries</span>
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--foreground)]"
            />
            <Input
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pr-3 pl-10 text-[var(--secondary)] placeholder:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              onValueChange={actions.onSearchQueryChange}
              placeholder="Search inquiries…"
              type="search"
              value={model.searchQuery}
            />
          </label>
        </div>

        <div>
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase sm:px-5 sm:py-3">
            Inquiries
          </div>
          <p aria-live="polite" className="sr-only" role="status">
            {model.totalInquiryCount === 1
              ? "1 inquiry shown."
              : `${model.totalInquiryCount} inquiries shown.`}
          </p>
          <ul aria-label="Patient inquiries">
            {model.visibleInquiries.map(({ inquiry, isActive }) => (
              <li key={inquiry.id}>
                <InquiryListItem
                  active={isActive}
                  inquiry={inquiry}
                  onSelect={() => actions.onInquirySelect(inquiry.id)}
                  ref={(element) => {
                    inquiryRefs.current[inquiry.id] = element
                  }}
                />
              </li>
            ))}
          </ul>
          {model.availability === "temporarily-unavailable" ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold text-[var(--secondary)]">Inquiries are unavailable</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">Refresh the page to try again.</p>
            </div>
          ) : model.totalInquiryCount === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-bold text-[var(--secondary)]">No inquiries found</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">Try another patient or treatment.</p>
            </div>
          ) : null}
        </div>
      </section>

      {model.selectedInquiry ? (
        <section
          aria-label={`Inquiry from ${model.selectedInquiry.name}`}
          className={cn(
            "min-h-0 min-w-0 flex-col overflow-hidden lg:flex",
            model.mobileInquiryOpen ? "flex" : "hidden",
          )}
          data-mobile-inquiry="true"
        >
          <header className="border-b border-[var(--border)] px-4 py-4 sm:px-6 sm:py-10">
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
              <Button
                aria-label="Back to inquiries"
                className="shrink-0 lg:hidden"
                onClick={returnToInquiryList}
                size="icon"
                variant="ghost"
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </Button>
              <Avatar
                className="size-11 sm:size-12"
                initials={getInitials(model.selectedInquiry.name) || "PI"}
              />
              <div className="min-w-0 flex-1">
                <h2
                  className="truncate text-lg font-bold text-[var(--secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:text-xl"
                  ref={mobileHeadingRef}
                  tabIndex={-1}
                >
                  {model.selectedInquiry.name}
                </h2>
                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[var(--foreground)] sm:text-sm">
                  <UserRound aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">Inquiry · {model.selectedInquiry.interest}</span>
                </p>
                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[var(--foreground)] sm:text-sm">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">
                    {model.selectedInquiry.treatmentTimeline} · {model.selectedInquiry.contactWindow}
                  </span>
                </p>
              </div>
              <div className="w-full pl-14 sm:w-auto sm:pl-0">
                <InquiryStatusMenu
                  availableTransitions={model.selectedInquiry.availableTransitions}
                  currentStatus={model.selectedInquiry.status}
                  isDisabled={model.isStatusChangeDisabled}
                  isUpdating={model.isUpdatingStatus}
                  onOpenChange={actions.onStatusMenuOpenChange}
                  onStatusChange={(status) => void actions.onStatusChange(status)}
                  open={model.isStatusMenuOpen}
                />
              </div>
            </div>
            <p aria-live="polite" className="sr-only" role="status">
              {model.statusMessage}
            </p>
            {model.statusError ? (
              <p className="mt-3 text-sm font-bold text-[var(--destructive)]" role="alert">
                {model.statusError}
              </p>
            ) : null}
          </header>

          <dl className="grid gap-x-6 gap-y-5 border-b border-[var(--border)] px-4 py-5 sm:grid-cols-2 sm:px-6 sm:py-10 xl:grid-cols-4">
            <div>
              <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                Interest
              </dt>
              <dd className="mt-2 text-sm font-bold text-[var(--secondary)]">
                {model.selectedInquiry.interest}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                Treatment timeline
              </dt>
              <dd className="mt-2 text-sm font-bold text-[var(--secondary)]">
                {model.selectedInquiry.treatmentTimeline}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                Preferred contact window
              </dt>
              <dd className="mt-2 text-sm font-bold text-[var(--secondary)]">
                {model.selectedInquiry.contactWindow}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold tracking-wide text-[var(--foreground)] uppercase">
                Contact
              </dt>
              <dd className="mt-2 space-y-1.5 text-sm text-[var(--secondary)]">
                <a
                  className="flex items-center gap-2 hover:text-[var(--primary)]"
                  href={`mailto:${model.selectedInquiry.email}`}
                >
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{model.selectedInquiry.email}</span>
                </a>
                <a
                  className="flex items-center gap-2 hover:text-[var(--primary)]"
                  href={`tel:${model.selectedInquiry.phone}`}
                >
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate">{model.selectedInquiry.phone}</span>
                </a>
              </dd>
            </div>
          </dl>

          <div
            aria-label={`Inquiry activity for ${model.selectedInquiry.name}`}
            aria-live="polite"
            aria-relevant="additions"
            className="min-h-0 flex-1 space-y-8 overflow-y-auto bg-[var(--canvas)] p-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:p-6"
            role="log"
            tabIndex={0}
          >
            <div className="flex items-center gap-3" role="separator">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs font-bold text-[var(--foreground)]">
                {model.selectedInquiry.dateLabel}
              </span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <div className="grid grid-cols-[3rem_minmax(0,36rem)] gap-3">
              <span className="pt-3 text-xs text-[var(--foreground)]">{model.selectedInquiry.timeLabel}</span>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-6 text-[var(--secondary)] shadow-sm">
                {model.selectedInquiry.message}
              </div>
            </div>

            {model.selectedStatusEvents.map((event) => (
              <div className="flex items-center gap-4" key={event.id}>
                <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
                <p className="flex shrink-0 items-center gap-2 rounded-md bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
                  <Clock3 aria-hidden="true" className="size-3.5" />
                  <span>
                    Status changed from {getPatientInquiryStatusLabel(event.from)} to{" "}
                    {getPatientInquiryStatusLabel(event.to)} · {event.changedAt}
                  </span>
                </p>
                <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section
          aria-label="Inquiry details"
          className="hidden items-center justify-center bg-[var(--canvas)] p-6 lg:flex"
        >
          <p className="max-w-sm text-center text-sm leading-6 text-[var(--foreground)]">
            {model.availability === "temporarily-unavailable"
              ? "Inquiry details are temporarily unavailable."
              : "Select an inquiry to review its details."}
          </p>
        </section>
      )}
    </div>
  )
}
