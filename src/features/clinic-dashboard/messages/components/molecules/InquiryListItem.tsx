import { forwardRef } from "react"
import { ChevronRight } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { PatientInquiry } from "../../model/inquiries"

type InquiryListItemProps = Readonly<{
  active: boolean
  inquiry: PatientInquiry
  onSelect: () => void
}>

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export const InquiryListItem = forwardRef<HTMLButtonElement, InquiryListItemProps>(function InquiryListItem(
  { active, inquiry, onSelect },
  ref,
) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "flex min-h-24 w-full items-center border-b border-l-4 border-[var(--border)] border-l-transparent px-3 py-3 text-left transition-colors hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] sm:min-h-28 sm:px-4",
        active && "bg-[var(--accent-soft)]",
        active && "border-l-[var(--accent)]",
      )}
      data-inquiry-id={inquiry.id}
      onClick={onSelect}
      ref={ref}
      type="button"
    >
      <Avatar className="mr-3 size-12" initials={getInitials(inquiry.name) || "PI"} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <strong className="truncate text-sm text-[var(--secondary)]">{inquiry.name}</strong>
          <span className="shrink-0 text-[11px] text-[var(--foreground)]">{inquiry.timeLabel}</span>
        </span>
        <span className="mt-1 block truncate text-xs font-bold text-[var(--primary-hover)]">
          {inquiry.interest}
        </span>
        <span className="mt-1 block truncate text-sm text-[var(--foreground)]">{inquiry.message}</span>
      </span>
      {inquiry.status === "submitted" ? (
        <span aria-label="New inquiry" className="ml-3 size-2.5 shrink-0 rounded-full bg-[var(--accent)]" />
      ) : null}
      <ChevronRight aria-hidden="true" className="ml-1 size-4 shrink-0 text-[var(--foreground)] lg:hidden" />
    </button>
  )
})
