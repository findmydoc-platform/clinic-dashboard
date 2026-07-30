import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  clinicProfileWeekdayLabels,
  formatClinicProfileOpeningHoursDay,
  type ClinicProfileValidationErrors,
} from "../../model/clinic-profile-editing"
import {
  clinicProfileWeekdayValues,
  type ClinicProfileOpeningHours,
  type ClinicProfileSourceAddress,
} from "../../model/clinic-profile-source"

type ClinicProfileDetailsProps = Readonly<{
  address: ClinicProfileSourceAddress
  errors: ClinicProfileValidationErrors
  isEditing: boolean
  onAddressEdit: () => void
  onOpeningHoursEdit: () => void
  openingHours?: ClinicProfileOpeningHours
}>

function hasError(errors: ClinicProfileValidationErrors, prefix: "address." | "openingHours.") {
  return Object.keys(errors).some((field) => field.startsWith(prefix))
}

export function ClinicProfileDetails({
  address,
  errors,
  isEditing,
  onAddressEdit,
  onOpeningHoursEdit,
  openingHours,
}: ClinicProfileDetailsProps) {
  return (
    <aside aria-label="Clinic profile details" className="min-w-0 space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--secondary)]">Address</h2>
          {isEditing ? (
            <Button onClick={onAddressEdit} size="small" variant="ghost">
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Button>
          ) : null}
        </div>
        {hasError(errors, "address.") ? (
          <p className="mt-3 text-sm font-bold text-[var(--destructive)]">
            Address details need attention before publishing.
          </p>
        ) : null}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Street</dt>
            <dd className="mt-1">
              {[address.street, address.houseNumber].filter(Boolean).join(" ") || "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">City</dt>
            <dd className="mt-1">{address.city?.name || "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Postal code</dt>
            <dd className="mt-1">{address.zipCode || "Not provided"}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Country</dt>
            <dd className="mt-1">{address.country.name}</dd>
          </div>
        </dl>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--secondary)]">Opening hours</h2>
          {isEditing ? (
            <Button onClick={onOpeningHoursEdit} size="small" variant="ghost">
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Button>
          ) : null}
        </div>
        {hasError(errors, "openingHours.") ? (
          <p className="mt-3 text-sm font-bold text-[var(--destructive)]">
            Opening hours need attention before publishing.
          </p>
        ) : null}
        {openingHours ? (
          <dl className="mt-5 space-y-3">
            {clinicProfileWeekdayValues.map((weekday) => (
              <div className="flex justify-between gap-4 text-sm" key={weekday}>
                <dt className="text-[var(--foreground)]">{clinicProfileWeekdayLabels[weekday]}</dt>
                <dd className="font-bold">{formatClinicProfileOpeningHoursDay(openingHours[weekday])}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-5 text-sm text-[var(--foreground)]">Not configured</p>
        )}
        <p className="mt-4 text-xs text-[var(--foreground)]">Local Türkiye time</p>
      </Card>
    </aside>
  )
}
