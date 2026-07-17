import { MapPin, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { ClinicOpeningHours, ClinicProfileDraft } from "../../model/clinic-profile"

type ClinicProfileDetailsProps = Readonly<{
  address: Readonly<ClinicProfileDraft["address"]>
  isEditingDisabled: boolean
  onAddressEdit: () => void
  onOpeningHoursEdit: () => void
  openingHours: readonly ClinicOpeningHours[]
  showEditActions: boolean
}>

export function ClinicProfileDetails({
  address,
  isEditingDisabled,
  onAddressEdit,
  onOpeningHoursEdit,
  openingHours,
  showEditActions,
}: ClinicProfileDetailsProps) {
  return (
    <aside aria-label="Clinic profile details" className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--secondary)]">Address</h2>
          {showEditActions ? (
            <Button disabled={isEditingDisabled} onClick={onAddressEdit} size="small" variant="ghost">
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Button>
          ) : null}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Street</dt>
            <dd className="mt-1">{address.street}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">City</dt>
            <dd className="mt-1">{address.city}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Postal code</dt>
            <dd className="mt-1">{address.postalCode}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-bold text-[var(--foreground)] uppercase">Phone</dt>
            <dd className="mt-1">{address.phone}</dd>
          </div>
        </dl>
        <button
          className="mt-5 flex h-40 w-full items-center justify-center rounded-lg bg-[var(--surface)] text-sm font-bold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          disabled={isEditingDisabled}
          onClick={isEditingDisabled ? undefined : onAddressEdit}
          type="button"
        >
          <MapPin aria-hidden="true" className="mr-2 size-5" /> Adjust map and address
        </button>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--secondary)]">Opening hours</h2>
          {showEditActions ? (
            <Button disabled={isEditingDisabled} onClick={onOpeningHoursEdit} size="small" variant="ghost">
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Button>
          ) : null}
        </div>
        <dl className="mt-5 space-y-3">
          {openingHours.map((entry) => (
            <div className="flex justify-between gap-4 text-sm" key={entry.days}>
              <dt className="text-[var(--foreground)]">{entry.days}</dt>
              <dd className="font-bold">{entry.hours}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </aside>
  )
}
