"use client"

import { Select } from "@/components/ui/select"
import {
  isClinicDashboardLocationId,
  type ClinicDashboardLocationId,
  type ClinicDashboardPrototypeLocation,
} from "../../model/locations"

type ClinicLocationSelectorProps = Readonly<{
  locations: readonly ClinicDashboardPrototypeLocation[]
  onValueChange: (locationId: ClinicDashboardLocationId) => void
  value: ClinicDashboardLocationId
}>

export function ClinicLocationSelector({ locations, onValueChange, value }: ClinicLocationSelectorProps) {
  return (
    <label className="flex w-full min-w-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-xs font-bold text-[var(--foreground)]">Clinic location</span>
      <Select
        className="min-w-0 flex-1"
        onValueChange={(nextValue) => {
          if (isClinicDashboardLocationId(nextValue)) onValueChange(nextValue)
        }}
        value={value}
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </Select>
    </label>
  )
}
