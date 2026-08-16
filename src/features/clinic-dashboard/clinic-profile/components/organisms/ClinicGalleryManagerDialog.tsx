"use client"

import Image from "next/image"
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { isClinicGalleryImageProxyUrl } from "@/lib/clinic-gallery-image-proxy"
import type { useClinicGalleryController } from "../../hooks/useClinicGalleryController"
import type { ClinicGalleryMedia } from "../../model/clinic-gallery"

type ClinicGalleryManagerDialogProps = Readonly<{
  controller: ReturnType<typeof useClinicGalleryController>
}>

function mediaSource(item: ClinicGalleryMedia) {
  return item.thumbnailUrl ?? item.url
}

function GalleryLoadingSkeleton() {
  return (
    <div aria-busy="true" className="grid min-h-[34rem] animate-pulse gap-5 lg:grid-cols-[17rem_1fr_20rem]">
      <span className="sr-only">Loading clinic gallery…</span>
      <div className="grid content-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="h-5 w-28 rounded bg-[var(--border)]" />
        {Array.from({ length: 5 }, (_, index) => (
          <div className="h-16 rounded-lg bg-[var(--border)]" key={index} />
        ))}
      </div>
      <div className="aspect-[4/3] self-center rounded-xl bg-[var(--surface)]" />
      <div className="grid content-start gap-4 rounded-xl border border-[var(--border)] p-5">
        <div className="h-6 w-32 rounded bg-[var(--border)]" />
        <div className="h-28 rounded-lg bg-[var(--surface)]" />
        <div className="h-28 rounded-lg bg-[var(--surface)]" />
      </div>
    </div>
  )
}

export function ClinicGalleryManagerDialog({ controller }: ClinicGalleryManagerDialogProps) {
  const { actions, model } = controller
  const [draggedId, setDraggedId] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)
  const busy = model.operation !== "idle"
  const selectedIndex = model.selected ? model.items.findIndex((item) => item.id === model.selected?.id) : -1
  const publishedRemovals = model.removed.filter((entry) => entry.item.status === "published")
  const publishedRemovalActionLabel =
    publishedRemovals.length === 1 ? "Remove image and save" : `Remove ${publishedRemovals.length} and save`
  const failedUploads = model.uploadRows.filter((row) => row.status === "failed")
  const isReviewingSelected = model.uploadReviewItem?.id === model.selected?.id

  useEffect(() => {
    if (model.open && !wasOpenRef.current) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
    }
    if (!model.open && wasOpenRef.current) openerRef.current?.focus()
    wasOpenRef.current = model.open
  }, [model.open])

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.currentTarget.files ?? [])]
    event.currentTarget.value = ""
    void actions.uploadFiles(files)
  }

  const removeSelected = () => {
    if (!model.selected) return
    const removedId = model.selected.id
    actions.remove(removedId)
    toast("Image removed from this gallery.", {
      action: { label: "Undo", onClick: () => actions.undoRemoval(removedId) },
      description: "It will remain unchanged until you save.",
    })
  }

  const dropOn = (event: DragEvent, targetIndex: number) => {
    event.preventDefault()
    if (draggedId) actions.reorder(draggedId, targetIndex)
    setDraggedId(undefined)
  }

  const reorderWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, itemId: string, index: number) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    actions.reorder(itemId, index + (event.key === "ArrowUp" ? -1 : 1))
  }

  return (
    <>
      {model.open ? (
        <section aria-labelledby="clinic-gallery-title" className="grid gap-5 pb-16 sm:pb-0">
          <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 lg:-mx-8 lg:-mt-7 lg:px-8">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
              <Button
                aria-label="Back to clinic profile"
                className="shrink-0 sm:hidden"
                disabled={busy}
                onClick={actions.requestClose}
                size="icon"
                variant="ghost"
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <nav
                  aria-label="Breadcrumb"
                  className="mb-1 hidden text-xs text-[var(--foreground)] sm:block"
                >
                  Clinic profile <span aria-hidden="true">/</span> Gallery
                </nav>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1
                    className="text-xl font-bold tracking-tight text-[var(--secondary)] focus:outline-none sm:text-3xl"
                    id="clinic-gallery-title"
                    ref={headingRef}
                    tabIndex={-1}
                  >
                    {model.isInteractive ? "Manage gallery" : "Clinic image gallery"}
                  </h1>
                  {model.snapshot ? (
                    <span className="text-sm text-[var(--foreground)]">
                      {model.items.length} of {model.snapshot.constraints.maxItems} images
                    </span>
                  ) : null}
                  {model.isDirty ? (
                    <span className="text-sm font-medium text-[var(--foreground)]">Unsaved changes</span>
                  ) : null}
                </div>
              </div>
              <div className="hidden flex-wrap items-center gap-2 sm:flex">
                <Button disabled={busy} onClick={actions.requestClose} variant="outline">
                  {model.isInteractive ? "Cancel" : "Close gallery"}
                </Button>
                {model.isInteractive ? (
                  <>
                    <Button
                      disabled={busy || model.availableUploadSlots === 0}
                      onClick={() => actions.setAddOpen(true)}
                      variant="outline"
                    >
                      <ImagePlus aria-hidden="true" className="size-4" /> Add images
                    </Button>
                    <Button
                      disabled={busy || model.conflict || !model.isDirty}
                      onClick={() => void actions.save()}
                    >
                      {model.operation === "saving" ? (
                        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                      ) : null}
                      {model.operation === "saving" ? "Saving gallery…" : "Save gallery"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </header>

          {model.conflict ? (
            <div
              className="flex flex-col gap-3 rounded-xl border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_20%,var(--background))] p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <div>
                  <strong className="text-[var(--secondary)]">Gallery changed elsewhere</strong>
                  <p className="mt-1 text-sm">
                    Your local values remain visible. Reloading replaces them with the latest saved gallery.
                  </p>
                </div>
              </div>
              <Button
                disabled={busy}
                onClick={() => actions.setConfirmation("reload-after-conflict")}
                variant="outline"
              >
                Reload latest
              </Button>
            </div>
          ) : model.message && model.messageTone === "error" ? (
            <div
              className="flex flex-col gap-3 rounded-xl border border-[var(--destructive)] bg-[color-mix(in_srgb,var(--destructive)_8%,var(--background))] p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-[var(--destructive)]"
                />
                <div>
                  <strong className="text-[var(--secondary)]">Gallery changes need attention</strong>
                  <p className="mt-1 text-sm">{model.message}</p>
                </div>
              </div>
              {model.snapshot && model.isDirty ? (
                <Button disabled={busy} onClick={() => void actions.save()} variant="outline">
                  Try saving again
                </Button>
              ) : model.snapshot ? null : (
                <Button disabled={busy} onClick={() => void actions.load()} variant="outline">
                  Try again
                </Button>
              )}
            </div>
          ) : model.message ? (
            <p aria-live="polite" className="text-sm text-[var(--foreground)]" role="status">
              {model.message}
            </p>
          ) : null}

          {failedUploads.length > 0 ? (
            <section
              aria-labelledby="failed-uploads-title"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-bold text-[var(--secondary)]" id="failed-uploads-title">
                    Some images were not added
                  </h2>
                  <p className="text-sm text-[var(--foreground)]">
                    The successful uploads are ready to describe. Retry or remove the failed files.
                  </p>
                </div>
              </div>
              <ul className="mt-3 grid gap-2" aria-label="Failed uploads">
                {failedUploads.map((row) => (
                  <li
                    className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-3 sm:flex-row sm:items-center"
                    key={row.id}
                  >
                    <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-[var(--destructive)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--secondary)]">{row.name}</p>
                      <p className="text-xs text-[var(--foreground)]">{row.error ?? "Upload failed."}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={busy}
                        onClick={() => void actions.retryUpload(row.id)}
                        size="small"
                        variant="outline"
                      >
                        Retry
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => actions.dismissUpload(row.id)}
                        size="small"
                        variant="ghost"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {model.operation === "loading" && !model.snapshot ? (
            <GalleryLoadingSkeleton />
          ) : !model.snapshot ? (
            <div
              className="grid min-h-96 place-items-center rounded-xl border border-[var(--border)] p-8 text-center"
              role="alert"
            >
              <div className="max-w-md">
                <h2 className="text-xl font-bold text-[var(--secondary)]">Gallery unavailable</h2>
                <p className="mt-2 text-sm leading-6">Your existing public gallery is unchanged.</p>
                <Button className="mt-5" onClick={() => void actions.load()} variant="outline">
                  Try again
                </Button>
              </div>
            </div>
          ) : model.items.length === 0 && model.removed.length === 0 ? (
            <div className="grid min-h-[34rem] place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)] p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto grid size-14 place-items-center rounded-xl bg-[var(--surface)]">
                  <ImagePlus aria-hidden="true" className="size-7 text-[var(--primary)]" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-[var(--secondary)]">Add your clinic photos</h2>
                <p className="mt-2 text-sm leading-6">
                  Start with the image that best represents the clinic. The first five images create the first
                  impression.
                </p>
                {model.isInteractive ? (
                  <Button className="mt-5" onClick={() => actions.setAddOpen(true)}>
                    <ImagePlus aria-hidden="true" className="size-4" /> Add images
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[38rem] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] lg:grid-cols-[17rem_minmax(0,1fr)_21rem]">
              <aside
                aria-label="Gallery image order"
                className="border-b border-[var(--border)] bg-[var(--surface)] p-4 lg:border-r lg:border-b-0"
              >
                <div className="mb-3">
                  <h2 className="font-bold text-[var(--secondary)]">Image order</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
                    The main image leads your profile. The first five shape the first impression.
                  </p>
                </div>
                {model.isInteractive && model.availableUploadSlots === 0 ? (
                  <p className="mb-3 border-l-2 border-[var(--primary)] pl-3 text-xs leading-5 text-[var(--foreground)]">
                    Gallery full. Save removals before adding replacement images.
                  </p>
                ) : null}
                <ol className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:overflow-visible">
                  {model.items.map((item, index) => (
                    <li
                      className={`w-16 shrink-0 lg:w-auto ${index === 5 ? "lg:mt-3 lg:border-t lg:border-[var(--border)] lg:pt-3" : ""}`}
                      key={item.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropOn(event, index)}
                    >
                      {index === 5 ? (
                        <span className="mb-2 hidden text-[0.6875rem] font-bold tracking-wide text-[var(--foreground)] uppercase lg:block">
                          More gallery images
                        </span>
                      ) : null}
                      <div
                        className={`grid w-16 grid-cols-1 items-center gap-1 rounded-lg border p-1 text-left lg:w-full lg:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)] lg:gap-2 lg:p-2 ${
                          model.selected?.id === item.id
                            ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--background))] shadow-[inset_3px_0_var(--accent)]"
                            : "border-[var(--border)] bg-[var(--background)]"
                        }`}
                      >
                        {model.isInteractive ? (
                          <button
                            aria-label={`Reorder image ${index + 1}. Use up and down arrow keys.`}
                            className="grid h-6 w-full cursor-grab place-items-center rounded-md text-xs font-bold focus-visible:outline-2 focus-visible:outline-[var(--primary)] lg:size-10"
                            draggable
                            onDragEnd={() => setDraggedId(undefined)}
                            onDragStart={() => setDraggedId(item.id)}
                            onKeyDown={(event) => reorderWithKeyboard(event, item.id, index)}
                            type="button"
                          >
                            <span className="lg:hidden">{index + 1}</span>
                            <GripVertical aria-hidden="true" className="hidden size-5 lg:block" />
                          </button>
                        ) : (
                          <span className="text-center text-sm font-bold">{index + 1}</span>
                        )}
                        <button
                          aria-current={model.selected?.id === item.id ? "true" : undefined}
                          aria-label={`${model.isInteractive ? "Edit" : "View"} image ${index + 1}: ${item.alt || "Alt text missing"}`}
                          className="relative aspect-square overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                          onClick={() => actions.select(item.id)}
                          type="button"
                        >
                          <Image
                            alt=""
                            className="object-cover"
                            fill
                            sizes="56px"
                            src={mediaSource(item)}
                            unoptimized={isClinicGalleryImageProxyUrl(mediaSource(item))}
                          />
                          {index === 0 ? (
                            <span className="absolute inset-x-0 bottom-0 bg-[rgb(0_0_0_/_0.72)] px-1 py-0.5 text-center text-[0.625rem] font-bold text-white lg:hidden">
                              Main
                            </span>
                          ) : null}
                        </button>
                        <button
                          className="hidden min-w-0 rounded-md px-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--primary)] lg:block"
                          onClick={() => actions.select(item.id)}
                          type="button"
                        >
                          <span className="block text-xs font-bold">
                            {index === 0
                              ? "Main image"
                              : index < 5
                                ? `Top image ${index + 1}`
                                : `Image ${index + 1}`}
                          </span>
                          <span className="block truncate text-xs text-[var(--foreground)]">
                            {item.alt || "Alt text required"}
                          </span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
                {model.removed.length > 0 ? (
                  <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <h3 className="text-sm font-bold text-[var(--secondary)]">
                      Removed ({model.removed.length})
                    </h3>
                    <div className="mt-2 grid gap-2">
                      {model.removed.map(({ item }) => (
                        <div
                          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2"
                          key={item.id}
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-md opacity-60">
                            <Image
                              alt=""
                              className="object-cover"
                              fill
                              sizes="44px"
                              src={mediaSource(item)}
                              unoptimized={isClinicGalleryImageProxyUrl(mediaSource(item))}
                            />
                          </div>
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {item.alt || "Untitled image"}
                          </span>
                          <Button
                            aria-label={`Restore ${item.alt || "image"}`}
                            onClick={() => actions.undoRemoval(item.id)}
                            size="icon"
                            variant="ghost"
                          >
                            <RotateCcw aria-hidden="true" className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>

              <div className="min-w-0 border-b border-[var(--border)] p-4 sm:p-6 lg:border-r lg:border-b-0">
                {model.selected ? (
                  <div className="mx-auto grid h-full max-w-4xl content-center gap-4">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--surface)]">
                      <Image
                        alt={model.selected.alt || "Selected clinic image"}
                        className="object-contain"
                        fill
                        priority
                        sizes="(min-width: 1024px) 55vw, 100vw"
                        src={model.selected.url}
                        unoptimized={isClinicGalleryImageProxyUrl(model.selected.url)}
                      />
                      <span className="absolute right-3 bottom-3 rounded-md bg-[rgb(0_0_0_/_0.72)] px-3 py-1 text-xs font-bold text-white">
                        {selectedIndex + 1} of {model.items.length}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--foreground)]">
                      {selectedIndex === 0
                        ? "This is the main image patients see first."
                        : selectedIndex < 5
                          ? "This image contributes to the first impression on the public profile."
                          : "This image adds depth and trust when patients open the full gallery."}
                    </p>
                  </div>
                ) : null}
              </div>

              <aside aria-label="Selected image details" className="p-4 sm:p-6">
                {model.selected ? (
                  <div className="grid gap-6">
                    {model.uploadReviewItem ? (
                      <div className="rounded-lg border border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--background))] p-4">
                        <p className="text-xs font-bold tracking-wide text-[var(--secondary)] uppercase">
                          New image {model.uploadReviewPosition?.current} of{" "}
                          {model.uploadReviewPosition?.total}
                        </p>
                        <h2 className="mt-1 font-bold text-[var(--secondary)]">Describe your new images</h2>
                        <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
                          A short factual description helps patients and screen readers understand the image.
                        </p>
                        {!isReviewingSelected ? (
                          <Button
                            className="mt-3"
                            onClick={() => actions.select(model.uploadReviewItem!.id)}
                            size="small"
                            variant="outline"
                          >
                            Continue new image
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    <div>
                      <h2 className="text-lg font-bold text-[var(--secondary)]">Image details</h2>
                      <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
                        Clear descriptions make the gallery accessible and easier to trust.
                      </p>
                    </div>
                    <Field
                      error={!model.selected.alt.trim() ? "Alt text is required before saving." : undefined}
                      isRequired
                      label="Alt text"
                    >
                      {(controlProps) => (
                        <Textarea
                          {...controlProps}
                          disabled={!model.isInteractive || busy}
                          onValueChange={(alt) => actions.updateItem(model.selected!.id, { alt })}
                          value={model.selected?.alt ?? ""}
                        />
                      )}
                    </Field>
                    <Field label="Caption (optional)">
                      {(controlProps) => (
                        <Textarea
                          {...controlProps}
                          disabled={!model.isInteractive || busy}
                          onValueChange={(captionText) =>
                            actions.updateItem(model.selected!.id, { captionText })
                          }
                          value={model.selected?.captionText ?? ""}
                        />
                      )}
                    </Field>
                    {isReviewingSelected ? (
                      <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-5">
                        <Button disabled={busy} onClick={actions.skipUploadReview} variant="outline">
                          Skip for now
                        </Button>
                        <Button disabled={busy} onClick={actions.completeUploadReview}>
                          {model.uploadReviewPosition?.current === model.uploadReviewPosition?.total
                            ? "Finish details"
                            : "Next image"}
                        </Button>
                      </div>
                    ) : null}
                    {model.isInteractive ? (
                      <div className="grid gap-3 border-t border-[var(--border)] pt-5">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--secondary)]">Main image</h3>
                          <p className="mt-1 text-xs text-[var(--foreground)]">
                            Moves this image to position 1.
                          </p>
                        </div>
                        <Button
                          disabled={busy || selectedIndex === 0}
                          onClick={() => actions.reorder(model.selected!.id, 0)}
                          variant="outline"
                        >
                          {selectedIndex === 0 ? <Check aria-hidden="true" className="size-4" /> : null}
                          {selectedIndex === 0 ? "Current main image" : "Set as main image"}
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            disabled={busy || selectedIndex <= 0}
                            onClick={() => actions.reorder(model.selected!.id, selectedIndex - 1)}
                            variant="outline"
                          >
                            <ArrowUp aria-hidden="true" className="size-4" /> Earlier
                          </Button>
                          <Button
                            disabled={busy || selectedIndex >= model.items.length - 1}
                            onClick={() => actions.reorder(model.selected!.id, selectedIndex + 1)}
                            variant="outline"
                          >
                            <ArrowDown aria-hidden="true" className="size-4" /> Later
                          </Button>
                        </div>
                        <div className="mt-2 border-t border-[var(--border)] pt-5">
                          <Button disabled={busy} onClick={removeSelected} variant="destructive">
                            <Trash2 aria-hidden="true" className="size-4" /> Remove image
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </aside>
            </div>
          )}

          <footer className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-2 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
            <Button disabled={busy} onClick={actions.requestClose} variant="outline">
              {model.isInteractive ? "Cancel" : "Close"}
            </Button>
            {model.isInteractive ? (
              <>
                <Button
                  disabled={busy || model.conflict || !model.isDirty}
                  onClick={() => void actions.save()}
                >
                  {model.operation === "saving" ? "Saving…" : "Save gallery"}
                </Button>
                <Button
                  disabled={busy || model.availableUploadSlots === 0}
                  onClick={() => actions.setAddOpen(true)}
                  variant="ghost"
                >
                  <ImagePlus aria-hidden="true" className="size-4" /> Add images
                </Button>
              </>
            ) : (
              <span aria-hidden="true" className="col-span-2" />
            )}
          </footer>
        </section>
      ) : null}

      <Modal
        description={`JPEG, PNG, WebP or AVIF. Up to 4 MB and ${model.snapshot ? Math.round(model.snapshot.constraints.maxPixels / 1_000_000) : 50} megapixels each. ${model.availableUploadSlots} spaces available.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              disabled={model.operation === "uploading"}
              onClick={() => actions.setAddOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={model.operation === "uploading" || model.availableUploadSlots === 0}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose images
            </Button>
          </div>
        }
        onOpenChange={actions.setAddOpen}
        open={model.open && model.addOpen}
        panelClassName="max-w-2xl"
        title="Add images"
      >
        <input
          accept={model.snapshot?.constraints.acceptedMimeTypes.join(",")}
          aria-label="Choose clinic images"
          className="sr-only"
          multiple
          onChange={handleFiles}
          ref={fileInputRef}
          type="file"
        />
        <button
          className="grid min-h-52 w-full place-items-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          disabled={model.operation === "uploading" || model.availableUploadSlots === 0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void actions.uploadFiles([...event.dataTransfer.files])
          }}
          type="button"
        >
          <span>
            <Upload aria-hidden="true" className="mx-auto size-8 text-[var(--primary)]" />
            <span className="mt-3 block font-bold text-[var(--secondary)]">Drop clinic images here</span>
            <span className="mt-1 block text-sm text-[var(--foreground)]">
              or choose them from your device
            </span>
          </span>
        </button>
        {model.uploadRows.length > 0 ? (
          <ul className="mt-4 grid gap-2" aria-label="Upload queue">
            {model.uploadRows.map((row) => (
              <li
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3"
                key={row.id}
              >
                {row.status === "uploading" ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-[var(--primary)]" />
                ) : null}
                {row.status === "uploaded" ? (
                  <Check aria-hidden="true" className="size-4 text-[var(--primary)]" />
                ) : null}
                {row.status === "failed" ? (
                  <X aria-hidden="true" className="size-4 text-[var(--destructive)]" />
                ) : null}
                <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                <span className="text-xs font-bold">{row.error ?? row.status}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Modal>

      <AlertDialog
        actions={
          <>
            <Button onClick={() => actions.setConfirmation(null)} variant="outline">
              Keep local changes
            </Button>
            <Button onClick={() => void actions.reloadAfterConflict()} variant="destructive">
              Reload latest
            </Button>
          </>
        }
        description="Your unsaved ordering, image details, removals and uploads will be replaced with the latest saved gallery."
        onOpenChange={(open) => {
          if (!open) actions.setConfirmation(null)
        }}
        open={model.open && model.confirmation === "reload-after-conflict"}
        title="Reload the latest gallery?"
      />
      <AlertDialog
        actions={
          <>
            <Button onClick={() => actions.setConfirmation(null)} variant="outline">
              Keep editing
            </Button>
            <Button onClick={() => void actions.closeWithoutSaving()} variant="destructive">
              Leave without saving
            </Button>
          </>
        }
        description="Your ordering, image details and newly uploaded drafts will be discarded. The public gallery stays unchanged."
        onOpenChange={(open) => {
          if (!open) actions.setConfirmation(null)
        }}
        open={model.open && model.confirmation === "leave"}
        title="Leave gallery editing?"
      />
      <AlertDialog
        actions={
          <>
            <Button onClick={() => actions.setConfirmation(null)} variant="outline">
              Keep editing
            </Button>
            <Button
              disabled={model.operation === "saving"}
              onClick={() => void actions.saveConfirmed()}
              variant="destructive"
            >
              {publishedRemovalActionLabel}
            </Button>
          </>
        }
        description={
          <span className="grid gap-4">
            {publishedRemovals[0] ? (
              <span className="flex items-center gap-3">
                <span className="relative block size-28 shrink-0 overflow-hidden rounded-lg bg-[var(--surface)] sm:size-32">
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="96px"
                    src={mediaSource(publishedRemovals[0].item)}
                    unoptimized={isClinicGalleryImageProxyUrl(mediaSource(publishedRemovals[0].item))}
                  />
                </span>
                <span>{publishedRemovals[0].item.alt || "Selected clinic image"}</span>
              </span>
            ) : null}
            <span>
              {publishedRemovals.length} published image{publishedRemovals.length === 1 ? "" : "s"} will be
              removed from the public gallery after this save. Other gallery changes will be saved at the same
              time.
            </span>
          </span>
        }
        onOpenChange={(open) => {
          if (!open) actions.setConfirmation(null)
        }}
        open={model.open && model.confirmation === "remove-and-save"}
        title={`Remove ${publishedRemovals.length} image${publishedRemovals.length === 1 ? "" : "s"} and save?`}
      />
    </>
  )
}
