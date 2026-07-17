"use client"

import Image from "next/image"
import { Check, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import type { ClinicGalleryItem } from "../../model/clinic-profile"

type GalleryDialogProps = Readonly<{
  gallery: readonly ClinicGalleryItem[]
  isReadOnly: boolean
  onOpenChange: (open: boolean) => void
  onSelectCover: (id: string) => void
  open: boolean
}>

export function GalleryDialog({
  gallery,
  isReadOnly,
  onOpenChange,
  onSelectCover,
  open,
}: GalleryDialogProps) {
  return (
    <Modal
      description={
        isReadOnly
          ? "View the images currently shown on the public clinic profile."
          : "Choose the image shown first on the public clinic profile."
      }
      footer={
        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>{isReadOnly ? "Close gallery" : "Done"}</Button>
        </div>
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-3xl"
      title={isReadOnly ? "Clinic image gallery" : "Edit clinic images"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {gallery.map((item) => (
          <article className="overflow-hidden rounded-xl border border-[var(--border)]" key={item.id}>
            <div className="relative aspect-[4/3]">
              <Image
                alt={item.alt}
                className="object-cover"
                fill
                loading="eager"
                sizes="(min-width: 640px) 20rem, 90vw"
                src={item.src}
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-3">
              <span className="min-w-0 truncate text-sm font-bold">{item.alt}</span>
              {isReadOnly ? (
                item.isCover ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                    <Check aria-hidden="true" className="size-4" /> Cover image
                  </span>
                ) : null
              ) : (
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
              )}
            </div>
          </article>
        ))}
      </div>
    </Modal>
  )
}
