import { ChevronDown, LoaderCircle } from "lucide-react"
import { Select } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  getInquiryHandlingStatusLabel,
  getInquiryHandlingStatusTargets,
  type InquiryHandlingStatus,
  type InquiryHandlingStatusTarget,
} from "../../model/inquiries"

type EditableInquiryHandlingStatus = Exclude<InquiryHandlingStatus, "spam">

type InquiryStatusMenuProps = Readonly<{
  currentStatus: EditableInquiryHandlingStatus
  isDisabled: boolean
  isUpdating: boolean
  onStatusChange: (status: InquiryHandlingStatusTarget) => void
}>

export function InquiryStatusMenu({
  currentStatus,
  isDisabled,
  isUpdating,
  onStatusChange,
}: InquiryStatusMenuProps) {
  const targets = getInquiryHandlingStatusTargets(currentStatus)

  return (
    <span className="relative inline-flex min-w-36">
      <Select
        aria-busy={isUpdating || undefined}
        aria-label="Inquiry status"
        className={cn("appearance-none pr-10 text-sm", isUpdating && "pr-12")}
        disabled={isDisabled || isUpdating}
        onValueChange={(value) => onStatusChange(value as InquiryHandlingStatusTarget)}
        value={currentStatus}
      >
        <option disabled value={currentStatus}>
          {getInquiryHandlingStatusLabel(currentStatus)}
        </option>
        {targets.map((status) => (
          <option key={status} value={status}>
            {getInquiryHandlingStatusLabel(status)}
          </option>
        ))}
      </Select>
      {isUpdating ? (
        <LoaderCircle
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-[var(--primary)]"
        />
      ) : (
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[var(--secondary)]"
          strokeWidth={2.5}
        />
      )}
    </span>
  )
}
