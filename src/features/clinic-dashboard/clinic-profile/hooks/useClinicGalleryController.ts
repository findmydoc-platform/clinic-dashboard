"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ClinicProfileManagementAccess } from "../model/clinic-profile-management"
import {
  clinicGalleryHasChanges,
  clinicGallerySaveInput,
  clinicGalleryUploadConstraintError,
  moveClinicGalleryItem,
  restoreClinicGalleryItem,
  type ClinicGalleryMedia,
  type ClinicGallerySnapshot,
} from "../model/clinic-gallery"
import { ClinicGalleryCommandError, type ClinicGalleryCommands } from "../model/clinic-gallery-commands"

export type ClinicGalleryUploadRow = Readonly<{
  error?: string
  id: string
  name: string
  status: "failed" | "queued" | "uploading" | "uploaded"
}>

type UploadRowState = ClinicGalleryUploadRow & Readonly<{ file: File }>
type RemovedItem = Readonly<{
  index: number
  item: ClinicGalleryMedia
  nextId?: string
  previousId?: string
}>
type Operation = "discarding" | "idle" | "loading" | "saving" | "uploading"
type MessageTone = "error" | "info"

async function readImagePixelCount(file: File) {
  if (typeof globalThis.createImageBitmap === "function") {
    const bitmap = await globalThis.createImageBitmap(file)
    const pixels = bitmap.width * bitmap.height
    bitmap.close()
    return pixels
  }

  return new Promise<number>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    const release = () => URL.revokeObjectURL(objectUrl)
    image.onload = () => {
      const pixels = image.naturalWidth * image.naturalHeight
      release()
      resolve(pixels)
    }
    image.onerror = () => {
      release()
      reject(new Error("Image dimensions could not be read."))
    }
    image.src = objectUrl
  })
}

export function useClinicGalleryController({
  commands,
  initialSnapshot,
  management,
  onSaved,
}: Readonly<{
  commands: ClinicGalleryCommands
  initialSnapshot?: ClinicGallerySnapshot
  management: ClinicProfileManagementAccess
  onSaved?: (snapshot: ClinicGallerySnapshot) => void
}>) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [items, setItems] = useState<readonly ClinicGalleryMedia[]>(initialSnapshot?.items ?? [])
  const [removed, setRemoved] = useState<readonly RemovedItem[]>([])
  const [selectedId, setSelectedId] = useState(initialSnapshot?.items[0]?.id)
  const [operation, setOperation] = useState<Operation>("idle")
  const [message, setMessage] = useState("")
  const [messageTone, setMessageTone] = useState<MessageTone>("info")
  const [open, setOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<
    "leave" | "reload-after-conflict" | "remove-and-save" | null
  >(null)
  const [conflict, setConflict] = useState(false)
  const [uploadRows, setUploadRows] = useState<readonly UploadRowState[]>([])
  const [uploadReviewIds, setUploadReviewIds] = useState<readonly string[]>([])
  const [uploadReviewTotal, setUploadReviewTotal] = useState(0)
  const uploadBatchActiveRef = useRef(false)
  const itemsRef = useRef(items)
  const pendingNavigationRef = useRef<(() => void) | undefined>(undefined)
  const removedRef = useRef(removed)

  const hasGalleryChanges = snapshot ? clinicGalleryHasChanges(snapshot, items) : false
  const pendingNewDraftIds = useMemo(() => {
    if (!snapshot) return []
    const savedIds = new Set(snapshot.items.map((item) => item.id))
    return [
      ...new Set(
        [...items, ...removed.map((entry) => entry.item)]
          .filter((item) => item.status === "draft" && !savedIds.has(item.id))
          .map((item) => item.id),
      ),
    ]
  }, [items, removed, snapshot])
  const removedNewDraftIds = useMemo(() => {
    if (!snapshot) return []
    const savedIds = new Set(snapshot.items.map((item) => item.id))
    return removed
      .map((entry) => entry.item)
      .filter((item) => item.status === "draft" && !savedIds.has(item.id))
      .map((item) => item.id)
  }, [removed, snapshot])
  const isDirty = hasGalleryChanges || pendingNewDraftIds.length > 0
  const availableUploadSlots = snapshot
    ? Math.max(0, snapshot.constraints.maxItems - snapshot.items.length - pendingNewDraftIds.length)
    : 0
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const uploadReviewItem = items.find((item) => item.id === uploadReviewIds[0])
  const isInteractive = management === "interactive"

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    removedRef.current = removed
  }, [removed])

  useEffect(() => {
    if (!isDirty) return
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", preventUnload)
    return () => window.removeEventListener("beforeunload", preventUnload)
  }, [isDirty])

  const continuePendingNavigation = useCallback(() => {
    const continuation = pendingNavigationRef.current
    pendingNavigationRef.current = undefined
    continuation?.()
  }, [])

  const replaceWithSnapshot = useCallback((next: ClinicGallerySnapshot) => {
    setSnapshot(next)
    setItems(next.items)
    setRemoved([])
    setSelectedId(next.items[0]?.id)
    setConflict(false)
    setUploadReviewIds([])
    setUploadReviewTotal(0)
  }, [])

  const load = useCallback(async () => {
    setOperation("loading")
    setMessage("")
    try {
      replaceWithSnapshot(await commands.loadGallery())
    } catch (error) {
      setMessageTone("error")
      setMessage(error instanceof Error ? error.message : "The gallery could not be loaded.")
    } finally {
      setOperation("idle")
    }
  }, [commands, replaceWithSnapshot])

  const openGallery = useCallback(() => {
    setOpen(true)
    if (!snapshot) void load()
  }, [load, snapshot])

  const discardDraftIds = useCallback(
    async (draftIds: readonly string[]) => {
      if (draftIds.length === 0) return
      await commands.discardDrafts(draftIds)
      const discarded = new Set(draftIds)
      setRemoved((current) => current.filter((entry) => !discarded.has(entry.item.id)))
    },
    [commands],
  )

  const discardNewDrafts = useCallback(
    () => discardDraftIds(pendingNewDraftIds),
    [discardDraftIds, pendingNewDraftIds],
  )

  const discardRemovedDrafts = useCallback(
    () => discardDraftIds(removedNewDraftIds),
    [discardDraftIds, removedNewDraftIds],
  )

  const closeWithoutSaving = useCallback(async () => {
    setConfirmation(null)
    setOperation("discarding")
    setMessage("")
    try {
      await discardNewDrafts()
      if (snapshot) replaceWithSnapshot(snapshot)
      setUploadRows([])
      setUploadReviewIds([])
      setUploadReviewTotal(0)
      setAddOpen(false)
      setOpen(false)
      continuePendingNavigation()
    } catch {
      pendingNavigationRef.current = undefined
      setMessageTone("error")
      setMessage("Draft cleanup failed. Your uploads may still be stored. Try leaving again.")
    } finally {
      setOperation("idle")
    }
  }, [continuePendingNavigation, discardNewDrafts, replaceWithSnapshot, snapshot])

  const reloadAfterConflict = useCallback(async () => {
    setConfirmation(null)
    setOperation("loading")
    setMessage("")
    try {
      await discardNewDrafts()
      replaceWithSnapshot(await commands.loadGallery())
    } catch (error) {
      setMessageTone("error")
      setMessage(
        error instanceof Error
          ? error.message
          : "The latest gallery or draft cleanup could not be completed.",
      )
    } finally {
      setOperation("idle")
    }
  }, [commands, discardNewDrafts, replaceWithSnapshot])

  const requestNavigation = useCallback(
    (continuation?: () => void) => {
      if (operation !== "idle") return
      pendingNavigationRef.current = continuation
      if (isDirty) {
        setConfirmation("leave")
        return
      }
      setOpen(false)
      continuePendingNavigation()
    },
    [continuePendingNavigation, isDirty, operation],
  )

  const requestClose = useCallback(() => requestNavigation(), [requestNavigation])

  const updateItem = useCallback(
    (id: string, change: Partial<Pick<ClinicGalleryMedia, "alt" | "captionText">>) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))
    },
    [],
  )

  const reorder = useCallback((id: string, targetIndex: number) => {
    setItems((current) => moveClinicGalleryItem(current, id, targetIndex))
  }, [])

  const remove = useCallback((id: string) => {
    setUploadReviewIds((current) => current.filter((candidate) => candidate !== id))
    const current = itemsRef.current
    const index = current.findIndex((item) => item.id === id)
    const item = current[index]
    if (!item) return
    const nextRemoved = [
      ...removedRef.current,
      {
        index,
        item,
        ...(current[index - 1] ? { previousId: current[index - 1].id } : {}),
        ...(current[index + 1] ? { nextId: current[index + 1].id } : {}),
      },
    ]
    const nextItems = current.filter((candidate) => candidate.id !== id)
    itemsRef.current = nextItems
    removedRef.current = nextRemoved
    setItems(nextItems)
    setRemoved(nextRemoved)
    setSelectedId(nextItems[Math.min(index, nextItems.length - 1)]?.id)
  }, [])

  const undoRemoval = useCallback(
    (id: string) => {
      const removedItem = removedRef.current.find((entry) => entry.item.id === id)
      if (!removedItem) return
      const active = itemsRef.current
      if (snapshot && active.length >= snapshot.constraints.maxItems) {
        setMessageTone("info")
        setMessage(`Only ${snapshot.constraints.maxItems} gallery images are allowed.`)
        return
      }
      const nextItems = restoreClinicGalleryItem(active, removedItem)
      const nextRemoved = removedRef.current.filter((entry) => entry.item.id !== id)
      itemsRef.current = nextItems
      removedRef.current = nextRemoved
      setItems(nextItems)
      setRemoved(nextRemoved)
      setSelectedId(id)
      setMessage("")
    },
    [snapshot],
  )

  const validateUploadFile = useCallback(
    async (file: File) => {
      if (!snapshot) return "Gallery is not available."
      let invalid = clinicGalleryUploadConstraintError(snapshot.constraints, {
        mimeType: file.type,
        size: file.size,
      })
      if (!invalid) {
        try {
          const pixels = await readImagePixelCount(file)
          invalid = clinicGalleryUploadConstraintError(snapshot.constraints, {
            mimeType: file.type,
            pixels,
            size: file.size,
          })
        } catch {
          invalid = "Image dimensions could not be read."
        }
      }
      return invalid
    },
    [snapshot],
  )

  const uploadFiles = useCallback(
    async (files: readonly File[]) => {
      if (!snapshot || !isInteractive || files.length === 0) return
      if (uploadBatchActiveRef.current || operation !== "idle") {
        setMessageTone("info")
        setMessage("Wait for the current gallery operation to finish.")
        return
      }
      uploadBatchActiveRef.current = true
      const available = availableUploadSlots
      const accepted = files.slice(0, available)
      const rows = accepted.map((file, index) => ({
        file,
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        status: "queued" as const,
      }))
      setUploadRows(rows)
      if (accepted.length < files.length) {
        setMessageTone("info")
        setMessage(`Only ${available} more image${available === 1 ? "" : "s"} can be added.`)
      } else {
        setMessage("")
      }
      setOperation("uploading")
      let cursor = 0
      const uploaded = new Map<string, ClinicGalleryMedia>()
      const worker = async () => {
        while (cursor < accepted.length) {
          const index = cursor
          cursor += 1
          const file = accepted[index]
          const row = rows[index]
          if (!file || !row) continue
          const invalid = await validateUploadFile(file)
          if (invalid) {
            setUploadRows((current) =>
              current.map((entry) =>
                entry.id === row.id ? { ...entry, error: invalid, status: "failed" } : entry,
              ),
            )
            continue
          }
          setUploadRows((current) =>
            current.map((entry) => (entry.id === row.id ? { ...entry, status: "uploading" } : entry)),
          )
          try {
            const media = await commands.uploadMedia({ file })
            uploaded.set(row.id, media)
            setUploadRows((current) =>
              current.map((entry) => (entry.id === row.id ? { ...entry, status: "uploaded" } : entry)),
            )
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Upload failed."
            setUploadRows((current) =>
              current.map((entry) =>
                entry.id === row.id ? { ...entry, error: errorMessage, status: "failed" } : entry,
              ),
            )
          }
        }
      }
      try {
        await Promise.all(
          Array.from({ length: Math.min(snapshot.constraints.maxConcurrentUploads, accepted.length) }, () =>
            worker(),
          ),
        )
        const uploadedInSelectionOrder = rows.flatMap((row) => {
          const item = uploaded.get(row.id)
          return item ? [item] : []
        })
        if (uploadedInSelectionOrder.length > 0) {
          setItems((current) => [...current, ...uploadedInSelectionOrder])
          setSelectedId(uploadedInSelectionOrder[0]?.id)
          setUploadReviewIds((current) => [...current, ...uploadedInSelectionOrder.map((item) => item.id)])
          setUploadReviewTotal((current) =>
            uploadReviewIds.length === 0
              ? uploadedInSelectionOrder.length
              : current + uploadedInSelectionOrder.length,
          )
          setAddOpen(false)
        }
      } finally {
        uploadBatchActiveRef.current = false
        setOperation("idle")
      }
    },
    [
      availableUploadSlots,
      commands,
      isInteractive,
      operation,
      snapshot,
      uploadReviewIds.length,
      validateUploadFile,
    ],
  )

  const retryUpload = useCallback(
    async (rowId: string) => {
      const row = uploadRows.find((candidate) => candidate.id === rowId)
      if (!row || row.status !== "failed" || operation !== "idle" || availableUploadSlots === 0) return
      setOperation("uploading")
      setUploadRows((current) =>
        current.map((candidate) =>
          candidate.id === rowId ? { ...candidate, error: undefined, status: "uploading" } : candidate,
        ),
      )
      try {
        const invalid = await validateUploadFile(row.file)
        if (invalid) throw new Error(invalid)
        const media = await commands.uploadMedia({ file: row.file })
        setItems((current) => [...current, media])
        setSelectedId(media.id)
        setUploadReviewIds((current) => [...current, media.id])
        setUploadReviewTotal((current) => (uploadReviewIds.length === 0 ? 1 : current + 1))
        setUploadRows((current) =>
          current.map((candidate) =>
            candidate.id === rowId ? { ...candidate, status: "uploaded" } : candidate,
          ),
        )
        setMessage("")
      } catch (error) {
        setUploadRows((current) =>
          current.map((candidate) =>
            candidate.id === rowId
              ? {
                  ...candidate,
                  error: error instanceof Error ? error.message : "Upload failed.",
                  status: "failed",
                }
              : candidate,
          ),
        )
      } finally {
        setOperation("idle")
      }
    },
    [availableUploadSlots, commands, operation, uploadReviewIds.length, uploadRows, validateUploadFile],
  )

  const dismissUpload = useCallback((rowId: string) => {
    setUploadRows((current) => current.filter((candidate) => candidate.id !== rowId))
  }, [])

  const advanceUploadReview = useCallback(
    (requireDescription: boolean) => {
      const currentId = uploadReviewIds[0]
      if (!currentId) return
      const current = items.find((item) => item.id === currentId)
      if (requireDescription && current && !current.alt.trim()) {
        setSelectedId(currentId)
        setMessageTone("error")
        setMessage("Add alt text before moving to the next new image, or skip it for now.")
        return
      }
      const nextIds = uploadReviewIds.slice(1)
      setUploadReviewIds(nextIds)
      if (nextIds.length === 0) setUploadReviewTotal(0)
      setSelectedId(nextIds[0] ?? currentId)
      setMessage("")
    },
    [items, uploadReviewIds],
  )

  const save = useCallback(async () => {
    if (!snapshot || !isDirty) return
    if (conflict) {
      setMessageTone("error")
      setMessage("Reload the latest gallery before saving again.")
      return
    }
    const missingAlt = items.find((item) => !item.alt.trim())
    if (missingAlt) {
      setSelectedId(missingAlt.id)
      setMessageTone("error")
      setMessage("Add alt text to every image before saving.")
      return
    }
    if (removed.some((entry) => entry.item.status === "published")) {
      setConfirmation("remove-and-save")
      return
    }

    setOperation("saving")
    setMessage("")
    try {
      await discardRemovedDrafts()
      if (!hasGalleryChanges) {
        replaceWithSnapshot(snapshot)
        setOpen(false)
        continuePendingNavigation()
        return
      }
      const next = await commands.saveGallery(clinicGallerySaveInput(snapshot, items))
      replaceWithSnapshot(next)
      onSaved?.(next)
      setOpen(false)
      continuePendingNavigation()
    } catch (error) {
      pendingNavigationRef.current = undefined
      const isConflict = error instanceof ClinicGalleryCommandError && error.code === "conflict"
      setConflict(isConflict)
      setMessageTone("error")
      setMessage(
        isConflict
          ? "Gallery changed elsewhere. Your local changes are preserved."
          : error instanceof Error
            ? error.message
            : "The gallery could not be saved.",
      )
    } finally {
      setOperation("idle")
      setConfirmation(null)
    }
  }, [
    commands,
    conflict,
    continuePendingNavigation,
    discardRemovedDrafts,
    hasGalleryChanges,
    isDirty,
    items,
    onSaved,
    removed,
    replaceWithSnapshot,
    snapshot,
  ])

  const saveConfirmed = useCallback(async () => {
    setConfirmation(null)
    if (!snapshot) return
    if (conflict) {
      setMessageTone("error")
      setMessage("Reload the latest gallery before saving again.")
      return
    }
    setOperation("saving")
    setMessage("")
    try {
      await discardRemovedDrafts()
      const next = await commands.saveGallery(clinicGallerySaveInput(snapshot, items))
      replaceWithSnapshot(next)
      onSaved?.(next)
      setOpen(false)
      continuePendingNavigation()
    } catch (error) {
      pendingNavigationRef.current = undefined
      const isConflict = error instanceof ClinicGalleryCommandError && error.code === "conflict"
      setConflict(isConflict)
      setMessageTone("error")
      setMessage(
        isConflict
          ? "Gallery changed elsewhere. Your local changes are preserved."
          : error instanceof Error
            ? error.message
            : "The gallery could not be saved.",
      )
    } finally {
      setOperation("idle")
    }
  }, [
    commands,
    conflict,
    continuePendingNavigation,
    discardRemovedDrafts,
    items,
    onSaved,
    replaceWithSnapshot,
    snapshot,
  ])

  const setConfirmationAction = useCallback(
    (next: "leave" | "reload-after-conflict" | "remove-and-save" | null) => {
      if (next === null) pendingNavigationRef.current = undefined
      setConfirmation(next)
    },
    [],
  )

  return {
    actions: {
      closeWithoutSaving,
      completeUploadReview: () => advanceUploadReview(true),
      dismissUpload,
      load,
      openGallery,
      remove,
      reloadAfterConflict,
      requestNavigation,
      retryUpload,
      reorder,
      requestClose,
      save,
      saveConfirmed,
      select: setSelectedId,
      setAddOpen,
      setConfirmation: setConfirmationAction,
      skipUploadReview: () => advanceUploadReview(false),
      undoRemoval,
      updateItem,
      uploadFiles,
    },
    model: useMemo(
      () => ({
        addOpen,
        availableUploadSlots,
        confirmation,
        conflict,
        isDirty,
        isInteractive,
        items,
        management,
        message,
        messageTone,
        open,
        operation,
        pendingExternalNavigation: Boolean(pendingNavigationRef.current),
        removed,
        selected,
        snapshot,
        uploadRows: uploadRows.map(({ error, id, name, status }) => ({ error, id, name, status })),
        uploadReviewItem,
        uploadReviewPosition:
          uploadReviewItem && uploadReviewIds.length > 0
            ? {
                current: uploadReviewTotal - uploadReviewIds.length + 1,
                total: uploadReviewTotal,
              }
            : undefined,
      }),
      [
        addOpen,
        availableUploadSlots,
        confirmation,
        conflict,
        isDirty,
        isInteractive,
        items,
        management,
        message,
        messageTone,
        open,
        operation,
        removed,
        selected,
        snapshot,
        uploadRows,
        uploadReviewIds,
        uploadReviewItem,
        uploadReviewTotal,
      ],
    ),
  }
}
