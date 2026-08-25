import { forwardRef } from "react"
import { LockKeyhole, ShieldAlert, UserRound } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getInquiryHandlingStatusLabel, type PatientInquiry } from "../../model/inquiries"

type InquiryListItemProps = Readonly<{
  active: boolean
  inquiry: PatientInquiry
  onSelect: () => void
}>

function InquiryState({ inquiry }: Readonly<{ inquiry: PatientInquiry }>) {
  if (inquiry.handlingStatus === "spam") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--destructive)_12%,var(--background))] px-2 py-1 text-[11px] font-bold text-[var(--destructive)]">
        <ShieldAlert aria-hidden="true" className="size-3.5" /> Spam
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

  if (inquiry.conversation.kind === "deleted-patient") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] font-bold text-[var(--foreground)]">
        <UserRound aria-hidden="true" className="size-3.5" /> Patient deleted · No chat
      </span>
    )
  }

  if (inquiry.lifecycle === "closed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-bold text-[var(--foreground)]">
        <LockKeyhole aria-hidden="true" className="size-3.5" /> Closed
      </span>
    )
  }

  return (
    <span className="text-xs font-bold text-[var(--foreground)]">
      {getInquiryHandlingStatusLabel(inquiry.handlingStatus)}
    </span>
  )
}

export const InquiryListItem = forwardRef<HTMLButtonElement, InquiryListItemProps>(function InquiryListItem(
  { active, inquiry, onSelect },
  ref,
) {
  return (
    <button
      aria-current={active ? "true" : undefined}
      className={cn(
        "w-full border-l-4 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]",
        active
          ? "border-l-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-l-transparent bg-[var(--background)]",
      )}
      data-inquiry-id={inquiry.id}
      onClick={onSelect}
      ref={ref}
      type="button"
    >
      <span className="flex items-start gap-3">
        {inquiry.patient.kind === "deleted" ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface)] text-[var(--foreground)]">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
        ) : (
          <Avatar className="size-9 shrink-0" initials={inquiry.patient.initials || "PI"} />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <strong className="min-w-0 truncate text-sm text-[var(--secondary)]">
              {inquiry.patient.name}
            </strong>
            <span className="shrink-0 text-[11px] text-[var(--foreground)]">{inquiry.lastActivityLabel}</span>
          </span>
          <span className="mt-1 block truncate text-xs font-bold text-[var(--foreground)]">
            {inquiry.patient.kind === "deleted" ? `Inquiry ${inquiry.id} · ` : null}
            {inquiry.interest}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 break-words text-[var(--foreground)] sm:line-clamp-1">
            {inquiry.latestActivityKind === "internal-note" ? (
              <strong className="text-[var(--secondary)]">Internal note</strong>
            ) : null}
            {inquiry.latestActivityKind === "internal-note" ? " · " : null}
            <span>{inquiry.lastActivityPreview}</span>
          </span>
          <span className="mt-2 flex min-h-5 flex-wrap items-center gap-2">
            <InquiryState inquiry={inquiry} />
            {inquiry.unread.count > 0 ? (
              <span
                aria-label={`${inquiry.unread.count} unread ${inquiry.unread.count === 1 ? "activity" : "activities"}`}
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--on-primary)]"
              >
                {inquiry.unread.count}
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </button>
  )
})
