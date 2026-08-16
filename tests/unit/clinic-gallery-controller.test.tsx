// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useClinicGalleryController } from "@/features/clinic-dashboard/clinic-profile/hooks/useClinicGalleryController"
import type {
  ClinicGalleryMedia,
  ClinicGallerySnapshot,
} from "@/features/clinic-dashboard/clinic-profile/model/clinic-gallery"

const constraints = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  maxConcurrentUploads: 3,
  maxFileBytes: 4 * 1024 * 1024,
  maxItems: 12,
  maxPixels: 50_000_000,
} as const

function media(id: string, status: ClinicGalleryMedia["status"] = "published"): ClinicGalleryMedia {
  return { alt: `Clinic image ${id}`, id, status, url: `/gallery/${id}.jpg` }
}

function snapshot(
  items: readonly ClinicGalleryMedia[] = [media("one"), media("two")],
): ClinicGallerySnapshot {
  return { constraints, items, revision: 4 }
}

function imageFile(name: string) {
  return new File(["image"], name, { type: "image/jpeg" })
}

function stubImageDimensions(width = 1, height = 1) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ close: vi.fn(), height, width })),
  )
}

function createCommands(initial = snapshot()) {
  return {
    discardDrafts: vi.fn(async () => undefined),
    loadGallery: vi.fn(async () => initial),
    saveGallery: vi.fn(async () => ({ ...initial, revision: initial.revision + 1 })),
    uploadMedia: vi.fn(async ({ file }: { file: File }) => media(`draft-${file.name}`, "draft")),
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("clinic gallery controller", () => {
  it("rejects images over the pixel limit before uploading", async () => {
    stubImageDimensions(10_000, 5_001)
    const commands = createCommands()
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: snapshot(), management: "interactive" }),
    )

    await act(async () => hook.result.current.actions.uploadFiles([imageFile("oversized.jpg")]))

    expect(commands.uploadMedia).not.toHaveBeenCalled()
    expect(hook.result.current.model.uploadRows[0]).toMatchObject({
      error: "Image exceeds the 50 megapixel limit.",
      status: "failed",
    })
  })

  it("runs at most three uploads and rejects an overlapping batch", async () => {
    stubImageDimensions()
    const pending: Array<() => void> = []
    let active = 0
    let maxActive = 0
    const commands = createCommands(snapshot([]))
    commands.uploadMedia.mockImplementation(
      ({ file }) =>
        new Promise((resolve) => {
          active += 1
          maxActive = Math.max(maxActive, active)
          pending.push(() => {
            active -= 1
            resolve(media(`draft-${file.name}`, "draft"))
          })
        }),
    )
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: snapshot([]), management: "interactive" }),
    )

    let firstBatch!: Promise<void>
    act(() => {
      firstBatch = hook.result.current.actions.uploadFiles([
        imageFile("one.jpg"),
        imageFile("two.jpg"),
        imageFile("three.jpg"),
        imageFile("four.jpg"),
      ])
    })
    await act(async () => undefined)
    expect(commands.uploadMedia).toHaveBeenCalledTimes(3)
    expect(maxActive).toBe(3)

    await act(async () => hook.result.current.actions.uploadFiles([imageFile("overlap.jpg")]))
    expect(commands.uploadMedia).toHaveBeenCalledTimes(3)
    expect(hook.result.current.model.message).toBe("Wait for the current gallery operation to finish.")

    await act(async () => pending.shift()?.())
    await act(async () => undefined)
    expect(commands.uploadMedia).toHaveBeenCalledTimes(4)
    for (const resolve of pending.splice(0)) resolve()
    await act(async () => firstBatch)

    expect(maxActive).toBe(3)
    expect(hook.result.current.model.items).toHaveLength(4)
  })

  it("keeps a removed new draft in the leave guard and discards it on exit", async () => {
    stubImageDimensions()
    const initial = snapshot([media("published")])
    const commands = createCommands(initial)
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: initial, management: "interactive" }),
    )

    act(() => hook.result.current.actions.openGallery())
    await act(async () => hook.result.current.actions.uploadFiles([imageFile("new.jpg")]))
    act(() => hook.result.current.actions.remove("draft-new.jpg"))
    act(() => hook.result.current.actions.requestClose())

    expect(hook.result.current.model.confirmation).toBe("leave")
    await act(async () => hook.result.current.actions.closeWithoutSaving())
    expect(commands.discardDrafts).toHaveBeenCalledWith(["draft-new.jpg"])
    expect(hook.result.current.model.open).toBe(false)
  })

  it("saves a confirmed published removal and closes with the returned snapshot", async () => {
    const initial = snapshot()
    const saved = { ...initial, items: [media("two")], revision: 5 }
    const commands = createCommands(initial)
    commands.saveGallery.mockResolvedValue(saved)
    const onSaved = vi.fn()
    const hook = renderHook(() =>
      useClinicGalleryController({
        commands,
        initialSnapshot: initial,
        management: "interactive",
        onSaved,
      }),
    )

    act(() => hook.result.current.actions.openGallery())
    act(() => hook.result.current.actions.remove("one"))
    await act(async () => hook.result.current.actions.save())
    expect(hook.result.current.model.confirmation).toBe("remove-and-save")

    await act(async () => hook.result.current.actions.saveConfirmed())

    expect(commands.saveGallery).toHaveBeenCalledWith({
      expectedRevision: 4,
      items: [{ alt: "Clinic image two", mediaId: "two" }],
    })
    expect(onSaved).toHaveBeenCalledWith(saved)
    expect(hook.result.current.model.open).toBe(false)
  })

  it("does not free an upload slot until a published removal is saved", () => {
    const full = snapshot(Array.from({ length: 12 }, (_, index) => media(String(index + 1))))
    const commands = createCommands(full)
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: full, management: "interactive" }),
    )

    act(() => hook.result.current.actions.remove("1"))

    expect(hook.result.current.model.availableUploadSlots).toBe(0)
  })

  it("guides metadata completion across newly uploaded images", async () => {
    stubImageDimensions()
    const initial = snapshot([])
    const commands = createCommands(initial)
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: initial, management: "interactive" }),
    )

    await act(async () =>
      hook.result.current.actions.uploadFiles([imageFile("one.jpg"), imageFile("two.jpg")]),
    )

    expect(hook.result.current.model.uploadReviewItem?.id).toBe("draft-one.jpg")
    expect(hook.result.current.model.uploadReviewPosition).toEqual({ current: 1, total: 2 })

    act(() => hook.result.current.actions.updateItem("draft-one.jpg", { alt: "Bright consultation room" }))
    act(() => hook.result.current.actions.completeUploadReview())

    expect(hook.result.current.model.uploadReviewItem?.id).toBe("draft-two.jpg")
    expect(hook.result.current.model.uploadReviewPosition).toEqual({ current: 2, total: 2 })

    act(() => hook.result.current.actions.skipUploadReview())
    expect(hook.result.current.model.uploadReviewItem).toBeUndefined()
  })

  it("retries one failed upload without repeating the successful files", async () => {
    stubImageDimensions()
    const initial = snapshot([])
    const commands = createCommands(initial)
    commands.uploadMedia
      .mockRejectedValueOnce(new Error("Connection interrupted."))
      .mockResolvedValueOnce(media("draft-retry", "draft"))
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: initial, management: "interactive" }),
    )

    await act(async () => hook.result.current.actions.uploadFiles([imageFile("retry.jpg")]))

    expect(hook.result.current.model.uploadRows[0]).toMatchObject({
      error: "Connection interrupted.",
      status: "failed",
    })

    await act(async () =>
      hook.result.current.actions.retryUpload(hook.result.current.model.uploadRows[0]!.id),
    )

    expect(commands.uploadMedia).toHaveBeenCalledTimes(2)
    expect(hook.result.current.model.items.map((item) => item.id)).toEqual(["draft-retry"])
    expect(hook.result.current.model.uploadRows[0]?.status).toBe("uploaded")
    expect(hook.result.current.model.uploadReviewPosition).toEqual({ current: 1, total: 1 })
  })

  it("preserves local changes and exposes a retryable error after save failure", async () => {
    const initial = snapshot()
    const commands = createCommands(initial)
    commands.saveGallery.mockRejectedValue(new Error("The gallery could not be saved."))
    const hook = renderHook(() =>
      useClinicGalleryController({ commands, initialSnapshot: initial, management: "interactive" }),
    )

    act(() => hook.result.current.actions.openGallery())
    act(() => hook.result.current.actions.updateItem("one", { alt: "Updated clinic reception" }))
    await act(async () => hook.result.current.actions.save())

    expect(hook.result.current.model.isDirty).toBe(true)
    expect(hook.result.current.model.messageTone).toBe("error")
    expect(hook.result.current.model.message).toBe("The gallery could not be saved.")
    expect(hook.result.current.model.open).toBe(true)
  })
})
