"use client"

import { useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  getClinicDashboardLocation,
  type ClinicDashboardLocationId,
  type ClinicDashboardLocation,
} from "../../model/locations"

type ClinicLocationSelectorProps = Readonly<{
  canSwitchLocations: boolean
  isDemoData?: boolean
  locations: readonly ClinicDashboardLocation[]
  onValueChange: (locationId: ClinicDashboardLocationId) => void
  organizationName: string
  value: ClinicDashboardLocationId
}>

function ClinicIdentity({
  clinicName,
  compactName,
  organizationName,
}: Readonly<{ clinicName: string; compactName: string; organizationName: string }>) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="order-1 block truncate text-xs leading-4 font-bold sm:order-2 sm:font-normal">
        {organizationName}
      </span>
      <span className="order-2 block truncate text-[11px] leading-4 text-[var(--foreground)] sm:hidden">
        {compactName}
      </span>
      <span className="order-1 hidden truncate text-sm leading-4 font-bold sm:block lg:text-base">
        {clinicName}
      </span>
    </span>
  )
}

export function ClinicLocationSelector({
  canSwitchLocations,
  isDemoData = false,
  locations,
  onValueChange,
  organizationName,
  value,
}: ClinicLocationSelectorProps) {
  const [open, setOpen] = useState(false)
  const pendingSelection = useRef<ClinicDashboardLocationId | undefined>(undefined)
  const selectedLocation = getClinicDashboardLocation(locations, value)
  const selectedClinicName = isDemoData ? `Demo data · ${selectedLocation.name}` : selectedLocation.name

  const switchable = canSwitchLocations && locations.length > 1
  const visibleLocations = switchable ? locations : [selectedLocation]

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`${switchable ? "Switch clinic location" : "Current clinic location"}. Current location: ${selectedClinicName}. Organization: ${organizationName}`}
          className="group -ml-2 flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none"
          type="button"
        >
          <ClinicIdentity
            clinicName={selectedClinicName}
            compactName={selectedLocation.selectorLabel}
            organizationName={organizationName}
          />
          <ChevronDown
            aria-hidden="true"
            className="hidden size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 sm:block"
          />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        aria-label="Clinic locations"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        collisionPadding={12}
        sideOffset={6}
        onCloseAutoFocus={() => {
          const selection = pendingSelection.current
          pendingSelection.current = undefined
          if (selection) requestAnimationFrame(() => onValueChange(selection))
        }}
      >
        <div className="px-4 py-3 text-sm font-bold text-[var(--secondary)]">
          {switchable ? "Switch location" : "Current clinic"}
        </div>
        <DropdownMenu.Separator className="mx-0 my-0" />
        <div className="space-y-1 p-1.5">
          {visibleLocations.map((location) => {
            const isSelected = location.id === value

            return (
              <DropdownMenu.Item
                aria-current={isSelected ? "location" : undefined}
                className={cn(
                  "min-h-14 items-start rounded-md border-l-2 px-3 py-2",
                  isSelected
                    ? "bg-[var(--accent-soft)] text-[var(--secondary)] data-[highlighted]:bg-[color-mix(in_srgb,var(--accent)_22%,var(--background))]"
                    : undefined,
                )}
                key={location.id}
                onSelect={() => {
                  if (switchable && !isSelected) pendingSelection.current = location.id
                }}
                style={{ borderLeftColor: isSelected ? "var(--accent)" : "transparent" }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-5 font-bold">{location.name}</span>
                  <span className="block text-xs leading-4 font-normal text-[var(--foreground)]">
                    {location.location}
                  </span>
                </span>
                {isSelected ? (
                  <Check
                    aria-hidden="true"
                    className="mt-1 size-4 shrink-0 text-[color-mix(in_srgb,var(--accent)_65%,var(--secondary))]"
                  />
                ) : null}
              </DropdownMenu.Item>
            )
          })}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
