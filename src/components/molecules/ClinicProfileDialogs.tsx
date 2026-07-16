"use client"

import Image from "next/image"
import { useState } from "react"
import { Check, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type {
  ClinicGalleryItem,
  ClinicOpeningHours,
  ClinicProfileDraft,
} from "@/lib/clinic-dashboard/profile"
import { cn } from "@/lib/utils"

export function SpecialtyDialog({
  existing,
  onAdd,
  onOpenChange,
  open,
}: {
  existing: readonly string[]
  onAdd: (specialty: string) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const options = ["Aesthetic medicine", "Dentistry", "Dermatology", "Hair transplantation"]
  const [value, setValue] = useState("")

  return (
    <Modal
      description="Add a specialty to the public clinic profile."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!value}
            onClick={() => {
              onAdd(value)
              onOpenChange(false)
            }}
          >
            Add specialty
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Add specialty"
    >
      <label className="grid gap-2 text-sm font-bold">
        Specialty
        <select
          className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        >
          <option value="">Select a specialty…</option>
          {options.map((option) => (
            <option disabled={existing.includes(option)} key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </Modal>
  )
}

export function GalleryDialog({
  gallery,
  onOpenChange,
  onSelectCover,
  open,
}: {
  gallery: readonly ClinicGalleryItem[]
  onOpenChange: (open: boolean) => void
  onSelectCover: (id: string) => void
  open: boolean
}) {
  return (
    <Modal
      description="Choose the image shown first on the public clinic profile."
      footer={
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-3xl"
      title="Clinic images"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {gallery.map((item) => (
          <article className="overflow-hidden rounded-xl border border-[var(--border)]" key={item.id}>
            <div className="relative aspect-[4/3]">
              <Image
                alt={item.alt}
                className="object-cover"
                fill
                sizes="(min-width: 640px) 20rem, 90vw"
                src={item.src}
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="min-w-0 truncate text-sm font-bold">{item.alt}</span>
              <Button
                aria-pressed={item.isCover}
                disabled={item.isCover}
                onClick={() => onSelectCover(item.id)}
                size="small"
                variant={item.isCover ? "secondary" : "outline"}
              >
                {item.isCover ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <ImageIcon aria-hidden="true" className="size-4" />
                )}
                {item.isCover ? "Cover" : "Set cover"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Modal>
  )
}

export function AddressDialog({
  address,
  onOpenChange,
  onSave,
  open,
}: {
  address: ClinicProfileDraft["address"]
  onOpenChange: (open: boolean) => void
  onSave: (address: ClinicProfileDraft["address"]) => void
  open: boolean
}) {
  const [draft, setDraft] = useState(address)

  return (
    <Modal
      description="Update the contact details shown on the public clinic profile."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft)
              onOpenChange(false)
            }}
          >
            Apply address
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Edit address"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {(
          [
            ["Street", "street"],
            ["City", "city"],
            ["Postal code", "postalCode"],
            ["Phone", "phone"],
          ] as const
        ).map(([label, key]) => (
          <label
            className={cn("grid gap-2 text-sm font-bold", key === "street" && "sm:col-span-2")}
            key={key}
          >
            {label}
            <input
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
              onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
              value={draft[key]}
            />
          </label>
        ))}
      </div>
    </Modal>
  )
}

export function OpeningHoursDialog({
  entries,
  onOpenChange,
  onSave,
  open,
}: {
  entries: readonly ClinicOpeningHours[]
  onOpenChange: (open: boolean) => void
  onSave: (entries: ClinicOpeningHours[]) => void
  open: boolean
}) {
  const [draft, setDraft] = useState<ClinicOpeningHours[]>(entries.map((entry) => ({ ...entry })))

  return (
    <Modal
      description="Update the hours shown on the public clinic profile."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft)
              onOpenChange(false)
            }}
          >
            Apply hours
          </Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Edit opening hours"
    >
      <div className="grid gap-4">
        {draft.map((entry, index) => (
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-center" key={entry.days}>
            <strong>{entry.days}</strong>
            <label className="grid gap-1 text-sm font-bold">
              <span className="sr-only">Hours for {entry.days}</span>
              <input
                aria-label={`Hours for ${entry.days}`}
                className="h-11 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
                onChange={(event) =>
                  setDraft((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, hours: event.target.value } : item,
                    ),
                  )
                }
                value={entry.hours}
              />
            </label>
          </div>
        ))}
      </div>
    </Modal>
  )
}
