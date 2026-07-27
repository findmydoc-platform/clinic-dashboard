"use client"

import { ChevronDown, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { getPatientInquiryStatusLabel, type PatientInquiryStatus } from "../../model/inquiries"

type InquiryStatusMenuProps = Readonly<{
  availableTransitions: readonly PatientInquiryStatus[]
  currentStatus: PatientInquiryStatus
  isDisabled: boolean
  isUpdating: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (status: PatientInquiryStatus) => void
  open: boolean
}>

function StatusButtonContent({
  currentStatus,
  isUpdating,
}: Readonly<{
  currentStatus: PatientInquiryStatus
  isUpdating: boolean
}>) {
  return (
    <>
      <span>Status: {getPatientInquiryStatusLabel(currentStatus)}</span>
      {isUpdating ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <ChevronDown aria-hidden="true" className="size-4" />
      )}
    </>
  )
}

export function InquiryStatusMenu({
  availableTransitions,
  currentStatus,
  isDisabled,
  isUpdating,
  onOpenChange,
  onStatusChange,
  open,
}: InquiryStatusMenuProps) {
  const statusChangeDisabled = isDisabled || availableTransitions.length === 0

  return (
    <DropdownMenu onOpenChange={onOpenChange} open={open && !statusChangeDisabled}>
      <DropdownMenu.Trigger asChild>
        <Button
          aria-label={`Change inquiry status. Current status: ${getPatientInquiryStatusLabel(currentStatus)}`}
          aria-busy={isUpdating || undefined}
          aria-disabled={statusChangeDisabled || undefined}
          className="min-w-44 justify-between"
          onClick={(event) => {
            if (statusChangeDisabled) event.preventDefault()
          }}
          onKeyDown={(event) => {
            if (statusChangeDisabled && [" ", "ArrowDown", "Enter"].includes(event.key)) {
              event.preventDefault()
            }
          }}
          onPointerDown={(event) => {
            if (statusChangeDisabled) event.preventDefault()
          }}
          variant="outline"
        >
          <StatusButtonContent currentStatus={currentStatus} isUpdating={isUpdating} />
        </Button>
      </DropdownMenu.Trigger>
      {!statusChangeDisabled ? (
        <DropdownMenu.Content align="end" aria-label="Allowed inquiry statuses">
          {availableTransitions.map((status) => (
            <DropdownMenu.Item key={status} onSelect={() => onStatusChange(status)}>
              {getPatientInquiryStatusLabel(status)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      ) : null}
    </DropdownMenu>
  )
}
