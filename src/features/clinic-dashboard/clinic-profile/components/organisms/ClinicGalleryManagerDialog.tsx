"use client"

import Image from "next/image"
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
} from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
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
    <div
      aria-busy="true"
      className="min-h-[34rem] animate-pulse overflow-hidden rounded-xl border border-[var(--border)]"
    >
      <span className="sr-only">Loading clinic gallery…</span>
      <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="h-5 w-28 rounded bg-[var(--border)]" />
        <div className="mt-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="h-24 w-32 shrink-0 rounded-lg bg-[var(--border)]" key={index} />
          ))}
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="p-4 sm:p-6">
          <div className="aspect-[16/10] rounded-xl bg-[var(--surface)]" />
        </div>
        <div className="grid content-start gap-4 border-t border-[var(--border)] p-5 lg:border-t-0 lg:border-l">
          <div className="h-6 w-32 rounded bg-[var(--border)]" />
          <div className="h-28 rounded-lg bg-[var(--surface)]" />
          <div className="h-28 rounded-lg bg-[var(--surface)]" />
        </div>
      </div>
    </div>
  )
}

function SelectedImageActionsMenu({
  busy,
  canMoveEarlier,
  canMoveLater,
  onMoveEarlier,
  onMoveLater,
  onRemove,
  triggerRef,
}: Readonly<{
  busy: boolean
  canMoveEarlier: boolean
  canMoveLater: boolean
  onMoveEarlier: () => void
  onMoveLater: () => void
  onRemove: () => void
  triggerRef: RefObject<HTMLButtonElement | null>
}>) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenu.Trigger asChild>
        <Button disabled={busy} ref={triggerRef} variant="outline">
          <MoreHorizontal aria-hidden="true" className="size-4" /> More image actions
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" aria-label="Selected image actions" className="w-60">
        <DropdownMenu.Item disabled={!canMoveEarlier} onSelect={onMoveEarlier}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Move earlier
        </DropdownMenu.Item>
        <DropdownMenu.Item disabled={!canMoveLater} onSelect={onMoveLater}>
          <ArrowRight aria-hidden="true" className="size-4" /> Move later
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={onRemove} variant="destructive">
          <Trash2 aria-hidden="true" className="size-4" /> Remove image
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}

export function ClinicGalleryManagerDialog({ controller }: ClinicGalleryManagerDialogProps) {
  const { actions, model } = controller
  const [draggedId, setDraggedId] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const selectedActionsRef = useRef<HTMLButtonElement>(null)
  const focusAfterRemovalRef = useRef(false)
  const openerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)
  const knownItemIdsRef = useRef(new Set<string>())
  const busy = model.operation !== "idle"
  const selectedIndex = model.selected ? model.items.findIndex((item) => item.id === model.selected?.id) : -1
  const publishedRemovals = model.removed.filter((entry) => entry.item.status === "published")
  const publishedRemovalActionLabel =
    publishedRemovals.length === 1 ? "Remove image and save" : `Remove ${publishedRemovals.length} and save`
  const failedUploads = model.uploadRows.filter((row) => row.status === "failed")
  const missingAltCount = model.items.filter((item) => !item.alt.trim()).length
  const saveDisabled = busy || model.conflict || !model.isDirty || missingAltCount > 0

  useEffect(() => {
    if (model.open && !wasOpenRef.current) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      knownItemIdsRef.current = new Set(model.items.map((item) => item.id))
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
    }
    if (!model.open && wasOpenRef.current) {
      openerRef.current?.focus()
      knownItemIdsRef.current = new Set()
    }
    wasOpenRef.current = model.open
  }, [model.items, model.open])

  useEffect(() => {
    if (!focusAfterRemovalRef.current || !model.open) return
    focusAfterRemovalRef.current = false
    const frame = requestAnimationFrame(() => {
      if (model.selected) selectedActionsRef.current?.focus({ preventScroll: true })
      else headingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [model.open, model.selected])

  useEffect(() => {
    if (!model.open) return
    const additions = model.items.filter(
      (item) => item.status === "draft" && !knownItemIdsRef.current.has(item.id),
    )
    if (additions.length > 0) {
      toast.success(`${additions.length} image${additions.length === 1 ? "" : "s"} uploaded.`)
    }
    for (const item of model.items) knownItemIdsRef.current.add(item.id)
  }, [model.items, model.open])

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.currentTarget.files ?? [])]
    event.currentTarget.value = ""
    void actions.uploadFiles(files)
  }

  const removeSelected = () => {
    if (!model.selected) return
    const removedId = model.selected.id
    focusAfterRemovalRef.current = true
    actions.remove(removedId)
    toast("Image removed from this gallery.", {
      action: { label: "Undo", onClick: () => actions.undoRemoval(removedId) },
      description: "It will remain unchanged until you save.",
    })
  }

  const selectItem = (itemId: string) => {
    actions.select(itemId)
  }

  const dropOn = (event: DragEvent, targetIndex: number) => {
    event.preventDefault()
    if (draggedId) actions.reorder(draggedId, targetIndex)
    setDraggedId(undefined)
  }

  const reorderWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>, itemId: string, index: number) => {
    const earlier = event.key === "ArrowLeft" || event.key === "ArrowUp"
    const later = event.key === "ArrowRight" || event.key === "ArrowDown"
    if (!earlier && !later) return
    event.preventDefault()
    actions.reorder(itemId, index + (earlier ? -1 : 1))
  }

  const saveButtonLabel = model.operation === "saving" ? "Saving and returning…" : "Save and return"

  return (
    <>
      {model.open ? (
        <section aria-labelledby="clinic-gallery-title" className="grid gap-5 pb-20 sm:pb-0">
          <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_94%,transparent)] px-4 py-3 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 lg:-mx-8 lg:-mt-7 lg:px-8">
            <div className="mx-auto grid max-w-[1440px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
              <Button
                aria-label="Back to profile"
                className="-ml-1 justify-start px-1 sm:-ml-3 sm:px-3"
                disabled={busy}
                onClick={actions.requestClose}
                variant="ghost"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                <span className="sm:hidden">Back</span>
                <span className="hidden sm:inline">Back to profile</span>
              </Button>
              <div className="flex min-w-0 flex-col items-center sm:flex-row sm:items-baseline sm:gap-3">
                <h1
                  className="truncate text-xl font-bold tracking-tight text-[var(--secondary)] focus:outline-none sm:text-3xl"
                  id="clinic-gallery-title"
                  ref={headingRef}
                  tabIndex={-1}
                >
                  {model.isInteractive ? "Manage gallery" : "Clinic image gallery"}
                </h1>
                {model.snapshot ? (
                  <span className="shrink-0 text-xs text-[var(--foreground)] sm:text-sm">
                    {model.items.length} of {model.snapshot.constraints.maxItems} images
                  </span>
                ) : null}
                {model.isDirty ? (
                  <span className="hidden shrink-0 text-sm font-medium text-[var(--foreground)] lg:inline">
                    Unsaved changes
                  </span>
                ) : null}
              </div>
              {model.isInteractive ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    aria-label="Add images"
                    className="px-3 min-[420px]:px-4"
                    disabled={busy || model.availableUploadSlots === 0}
                    onClick={() => actions.setAddOpen(true)}
                    variant="outline"
                  >
                    <ImagePlus aria-hidden="true" className="size-4" />
                    <span className="hidden min-[420px]:inline">Add images</span>
                  </Button>
                  <Button
                    className="hidden sm:inline-flex"
                    disabled={saveDisabled}
                    onClick={() => void actions.save()}
                  >
                    {model.operation === "saving" ? (
                      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                    ) : null}
                    {saveButtonLabel}
                  </Button>
                </div>
              ) : null}
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
                <Button disabled={saveDisabled} onClick={() => void actions.save()} variant="outline">
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
              <h2 className="font-bold text-[var(--secondary)]" id="failed-uploads-title">
                Some images were not added
              </h2>
              <p className="mt-1 text-sm text-[var(--foreground)]">
                Successful uploads are already in the gallery. Retry or remove the failed files.
              </p>
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
            <div className="grid min-h-[28rem] place-items-center rounded-xl border border-[var(--border)] bg-[var(--background)] p-8 text-center">
              <div className="max-w-md">
                <div className="mx-auto grid size-14 place-items-center rounded-xl bg-[var(--surface)]">
                  <ImagePlus aria-hidden="true" className="size-7 text-[var(--primary)]" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-[var(--secondary)]">Add your clinic photos</h2>
                <p className="mt-2 text-sm leading-6">
                  Start with the image that best represents the clinic. The first five images shape the first
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
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <section
                aria-labelledby="gallery-order-title"
                className="border-b border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-bold text-[var(--secondary)]" id="gallery-order-title">
                      Image order
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--foreground)]">
                      The main image leads your profile. Drag images to change their order.
                    </p>
                  </div>
                  {model.isInteractive && model.availableUploadSlots === 0 ? (
                    <p className="text-xs text-[var(--foreground)]">
                      Gallery full. Save removals before adding replacements.
                    </p>
                  ) : null}
                </div>

                <ol className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Gallery image order">
                  {model.items.map((item, index) => {
                    const missingAlt = !item.alt.trim()
                    const selected = model.selected?.id === item.id
                    return (
                      <li
                        className="w-32 shrink-0"
                        key={item.id}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => dropOn(event, index)}
                      >
                        <div
                          className={`relative rounded-lg border p-1.5 ${
                            selected
                              ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--background))] shadow-[inset_0_-3px_var(--accent)]"
                              : missingAlt
                                ? "border-[var(--destructive)] bg-[var(--background)]"
                                : "border-[var(--border)] bg-[var(--background)]"
                          }`}
                        >
                          <button
                            aria-current={selected ? "true" : undefined}
                            aria-label={`${model.isInteractive ? "Edit" : "View"} image ${index + 1}: ${item.alt || "Alt text missing"}`}
                            className="relative block aspect-[4/3] w-full overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                            onClick={() => selectItem(item.id)}
                            type="button"
                          >
                            <Image
                              alt=""
                              className="object-cover"
                              fill
                              sizes="128px"
                              src={mediaSource(item)}
                              unoptimized={isClinicGalleryImageProxyUrl(mediaSource(item))}
                            />
                            <span className="absolute top-1 right-1 rounded bg-[rgb(0_0_0_/_0.72)] px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
                              {index + 1}
                            </span>
                            {index === 0 ? (
                              <span className="absolute inset-x-1 bottom-1 rounded bg-[rgb(0_0_0_/_0.72)] px-1 py-0.5 text-center text-[0.625rem] font-bold text-white">
                                Main image
                              </span>
                            ) : null}
                          </button>
                          <div className="mt-1 flex min-h-7 items-center gap-1">
                            {model.isInteractive ? (
                              <button
                                aria-label={`Reorder image ${index + 1}. Use arrow keys.`}
                                className="grid size-7 shrink-0 cursor-grab place-items-center rounded text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
                                draggable
                                onDragEnd={() => setDraggedId(undefined)}
                                onDragStart={() => setDraggedId(item.id)}
                                onKeyDown={(event) => reorderWithKeyboard(event, item.id, index)}
                                type="button"
                              >
                                <GripVertical aria-hidden="true" className="size-4" />
                              </button>
                            ) : null}
                            <button
                              className={`min-w-0 flex-1 truncate rounded px-1 text-left text-[0.6875rem] font-bold focus-visible:outline-2 focus-visible:outline-[var(--primary)] ${
                                missingAlt ? "text-[var(--destructive)]" : "text-[var(--foreground)]"
                              }`}
                              onClick={() => selectItem(item.id)}
                              type="button"
                            >
                              {missingAlt ? "Needs alt text" : item.alt}
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>

                {missingAltCount > 0 ? (
                  <p className="mt-2 text-xs font-medium text-[var(--destructive)]" role="status">
                    {missingAltCount} image{missingAltCount === 1 ? " needs" : "s need"} alt text before
                    saving.
                  </p>
                ) : null}

                {model.removed.length > 0 ? (
                  <div className="mt-4 border-t border-[var(--border)] pt-4">
                    <h3 className="text-sm font-bold text-[var(--secondary)]">
                      Removed ({model.removed.length})
                    </h3>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {model.removed.map(({ item }) => (
                        <div
                          className="flex w-56 shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-2"
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
              </section>

              <div className="grid min-h-[32rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 p-4 sm:p-6">
                  {model.selected ? (
                    <div className="mx-auto grid max-w-5xl content-start gap-3">
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-[var(--surface)]">
                        <Image
                          alt={model.selected.alt || "Selected clinic image"}
                          className="object-contain"
                          fill
                          priority
                          sizes="(min-width: 1024px) 65vw, 100vw"
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

                <aside
                  aria-label="Selected image details"
                  className="border-t border-[var(--border)] p-4 sm:p-6 lg:border-t-0 lg:border-l"
                >
                  {model.selected ? (
                    <div className="grid gap-5 lg:sticky lg:top-36">
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

                      {model.isInteractive ? (
                        <div className="grid gap-3 border-t border-[var(--border)] pt-5">
                          {selectedIndex === 0 ? (
                            <p className="flex items-center gap-2 text-sm font-bold text-[var(--secondary)]">
                              <Check aria-hidden="true" className="size-4 text-[var(--primary)]" /> Main image
                            </p>
                          ) : (
                            <Button
                              disabled={busy}
                              onClick={() => actions.reorder(model.selected!.id, 0)}
                              variant="outline"
                            >
                              Set as main image
                            </Button>
                          )}

                          <SelectedImageActionsMenu
                            busy={busy}
                            canMoveEarlier={selectedIndex > 0}
                            canMoveLater={selectedIndex < model.items.length - 1}
                            key={model.selected.id}
                            onMoveEarlier={() => actions.reorder(model.selected!.id, selectedIndex - 1)}
                            onMoveLater={() => actions.reorder(model.selected!.id, selectedIndex + 1)}
                            onRemove={removeSelected}
                            triggerRef={selectedActionsRef}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </aside>
              </div>
            </div>
          )}

          {model.isInteractive ? (
            <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_96%,transparent)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
              <Button className="w-full" disabled={saveDisabled} onClick={() => void actions.save()}>
                {model.operation === "saving" ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : null}
                {saveButtonLabel}
              </Button>
            </footer>
          ) : null}
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
            <Button disabled={busy} onClick={() => actions.setConfirmation(null)} variant="outline">
              Keep editing
            </Button>
            <Button disabled={busy} onClick={() => void actions.closeWithoutSaving()} variant="destructive">
              Discard changes
            </Button>
            <Button disabled={saveDisabled} onClick={() => void actions.save()}>
              {saveButtonLabel}
            </Button>
          </>
        }
        description={
          model.pendingExternalNavigation
            ? "Your gallery changes have not been saved yet. Continue only after saving or discarding them."
            : "Your gallery changes have not been saved yet. You are returning to Clinic profile."
        }
        onOpenChange={(open) => {
          if (!open) actions.setConfirmation(null)
        }}
        open={model.open && model.confirmation === "leave"}
        title="Save changes before leaving?"
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
