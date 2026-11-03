// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useInquiryQueueController } from "@/features/clinic-dashboard/messages/hooks/useInquiryQueueController"
import type { InquiryWorkspaceCommands } from "@/features/clinic-dashboard/messages/model/inquiry-status-commands"
import type {
  PatientInquiry,
  PatientInquiryDetail,
  PatientInquiryQueueSnapshot,
} from "@/features/clinic-dashboard/messages/model/inquiries"
import {
  closedInquiryFixture,
  inquiryDetailFixtures,
  inquiryQueueFixture,
  spamInquiryFixture,
} from "@/features/clinic-dashboard/messages/testing/public"

function detailFor(inquiryId: string): PatientInquiryDetail | undefined {
  return [
    inquiryDetailFixtures.open,
    inquiryDetailFixtures.guest,
    closedInquiryFixture,
    spamInquiryFixture,
  ].find(({ id }) => id === inquiryId)
}

function summary(id: string, lastActivityAt: string): PatientInquiry {
  return {
    ...inquiryDetailFixtures.open,
    changeCursor: `cursor-${id}`,
    id,
    lastActivityAt,
    patient: { initials: id.slice(-1).toUpperCase(), kind: "verified", name: `Patient ${id}` },
  }
}

function createCommands(overrides: Partial<InquiryWorkspaceCommands> = {}): InquiryWorkspaceCommands {
  const commands = {
    async addInternalNote(input) {
      const inquiry = detailFor(input.inquiryId)
      return inquiry
        ? { ok: true as const, value: { inquiry } }
        : { error: { code: "not-found" as const }, ok: false as const }
    },
    async changeReadPosition(input) {
      return {
        ok: true as const,
        value: {
          unread: input.mode === "read" ? { count: 0, isUnread: false } : { count: 1, isUnread: true },
        },
      }
    },
    async changeState(input) {
      const inquiry = detailFor(input.inquiryId)
      if (!inquiry) return { error: { code: "not-found" as const }, ok: false as const }
      return {
        ok: true as const,
        value: {
          inquiry:
            input.action === "set-handling-status"
              ? {
                  ...inquiry,
                  handlingStatus: input.handlingStatus,
                  revision: inquiry.revision + 1,
                }
              : inquiry,
        },
      }
    },
    async createAttachmentDraft({ file }) {
      return {
        ok: true as const,
        value: {
          draftId: "synthetic-draft",
          expiresAt: "2026-08-25T10:00:00.000Z",
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "ready" as const,
        },
      }
    },
    async discardAttachmentDraft() {
      return { ok: true as const, value: { discarded: true } }
    },
    async loadDetail({ inquiryId, knownChangeCursor }) {
      const inquiry = detailFor(inquiryId)
      return inquiry
        ? {
            ok: true as const,
            value: {
              changeCursor: inquiry.changeCursor,
              inquiry,
              unchanged: knownChangeCursor === inquiry.changeCursor,
            },
          }
        : { error: { code: "not-found" as const }, ok: false as const }
    },
    async loadQueue() {
      return { ok: true as const, value: inquiryQueueFixture }
    },
    async revealContact({ inquiryId }) {
      const inquiry = detailFor(inquiryId)
      return inquiry
        ? { ok: true as const, value: { inquiry } }
        : { error: { code: "not-found" as const }, ok: false as const }
    },
    async sendExternalMessage(input) {
      const inquiry = detailFor(input.inquiryId)
      return inquiry
        ? { ok: true as const, value: { inquiry } }
        : { error: { code: "not-found" as const }, ok: false as const }
    },
    ...overrides,
  } satisfies InquiryWorkspaceCommands

  return commands
}

describe("Inquiry queue controller", () => {
  it("retries a failed continuation at its original page without replacing retained entries", async () => {
    const loadQueue = vi
      .fn<InquiryWorkspaceCommands["loadQueue"]>()
      .mockResolvedValueOnce({ ok: false, error: { code: "service-unavailable" } })
      .mockResolvedValueOnce({
        ok: true,
        value: { ...inquiryQueueFixture, inquiries: [summary("next", "2026-10-01")], nextCursor: undefined },
      })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: { ...inquiryQueueFixture, nextCursor: "intended-page" },
      }),
    )
    const initialIds = result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)
    await act(() => result.current.actions.onLoadMore())
    expect(result.current.model.queueOperation).toBe("append")
    expect(result.current.model.queueError).toBeTruthy()
    expect(result.current.model.isLoadingQueue).toBe(false)
    await act(() => result.current.actions.onQueueRefresh())
    expect(loadQueue.mock.calls.map(([query]) => query.cursor)).toEqual(["intended-page", "intended-page"])
    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual(
      expect.arrayContaining([...initialIds, "next"]),
    )
    expect(result.current.model.queueError).toBeUndefined()
  })

  it("pauses queue interval and focus refresh while the section is inactive", async () => {
    vi.useFakeTimers()
    const loadQueue = vi
      .fn<InquiryWorkspaceCommands["loadQueue"]>()
      .mockResolvedValue({ ok: true, value: inquiryQueueFixture })
    const commands = createCommands({ loadQueue })
    const { rerender, unmount } = renderHook(
      ({ isActive }) =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands,
          snapshot: inquiryQueueFixture,
          isActive,
        }),
      { initialProps: { isActive: false } },
    )
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000)
        window.dispatchEvent(new Event("focus"))
        window.dispatchEvent(new Event("online"))
        document.dispatchEvent(new Event("visibilitychange"))
      })
      expect(loadQueue).not.toHaveBeenCalled()
      rerender({ isActive: true })
      await act(async () => {
        window.dispatchEvent(new Event("focus"))
      })
      expect(loadQueue).toHaveBeenCalledOnce()
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it("lets foreground refresh supersede a background request and ignores its obsolete failure", async () => {
    let finishBackground!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["loadQueue"]>>) => void
    let finishForeground!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["loadQueue"]>>) => void
    const loadQueue = vi
      .fn<InquiryWorkspaceCommands["loadQueue"]>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishBackground = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishForeground = resolve
          }),
      )
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )
    await act(async () => {
      window.dispatchEvent(new Event("focus"))
    })
    let foreground!: Promise<void>
    act(() => {
      foreground = result.current.actions.onQueueRefresh()
    })
    expect(loadQueue).toHaveBeenCalledTimes(2)
    await act(async () => {
      finishBackground({ ok: false, error: { code: "service-unavailable" } })
    })
    expect(result.current.model.isLoadingQueue).toBe(true)
    expect(result.current.model.queueOperation).toBe("refresh")
    expect(result.current.model.queueError).toBeUndefined()
    await act(async () => {
      finishForeground({ ok: true, value: { ...inquiryQueueFixture, unreadCount: 19 } })
      await foreground
    })
    expect(result.current.model.totalUnreadCount).toBe(19)
    expect(result.current.model.isLoadingQueue).toBe(false)
  })

  it("claims duplicate same-tick continuation once and retains entries until it completes", async () => {
    let finish!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["loadQueue"]>>) => void
    const loadQueue = vi.fn<InquiryWorkspaceCommands["loadQueue"]>(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: { ...inquiryQueueFixture, nextCursor: "next-page" },
      }),
    )
    const initialIds = result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)
    let first!: Promise<void>
    let duplicate!: Promise<void>
    act(() => {
      first = result.current.actions.onLoadMore()
      duplicate = result.current.actions.onLoadMore()
    })
    expect(loadQueue).toHaveBeenCalledOnce()
    expect(result.current.model.queueOperation).toBe("append")
    expect(result.current.model.isLoadingQueue).toBe(true)
    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual(initialIds)
    await act(async () => {
      finish({
        ok: true,
        value: { ...inquiryQueueFixture, inquiries: [summary("next", "2026-10-01")], nextCursor: undefined },
      })
      await Promise.all([first, duplicate])
    })
    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual(
      expect.arrayContaining([...initialIds, "next"]),
    )
    expect(result.current.model.visibleInquiries.filter(({ inquiry }) => inquiry.id === "next")).toHaveLength(
      1,
    )
    expect(result.current.model.isLoadingQueue).toBe(false)
  })

  it("keeps rejected refresh recoverable and retries without losing the loaded queue", async () => {
    const loadQueue = vi
      .fn<InquiryWorkspaceCommands["loadQueue"]>()
      .mockRejectedValueOnce(new Error("synthetic transport failure"))
      .mockResolvedValueOnce({
        ok: true,
        value: { ...inquiryQueueFixture, unchanged: true, unreadCount: 23 },
      })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )
    const ids = result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)
    await act(() => result.current.actions.onQueueRefresh())
    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual(ids)
    expect(result.current.model.queueOperation).toBe("refresh")
    expect(result.current.model.queueError).toBeTruthy()
    expect(result.current.model.isLoadingQueue).toBe(false)
    await act(() => result.current.actions.onQueueRefresh())
    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual(ids)
    expect(result.current.model.totalUnreadCount).toBe(23)
    expect(result.current.model.queueError).toBeUndefined()
  })

  it("suppresses background triggers during foreground work and pending search debounce", async () => {
    vi.useFakeTimers()
    let finish!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["loadQueue"]>>) => void
    const loadQueue = vi.fn<InquiryWorkspaceCommands["loadQueue"]>(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { result, unmount } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )
    try {
      act(() => result.current.actions.onSearchQueryChange("latest"))
      await act(async () => {
        window.dispatchEvent(new Event("focus"))
        window.dispatchEvent(new Event("online"))
        document.dispatchEvent(new Event("visibilitychange"))
        await vi.advanceTimersByTimeAsync(249)
      })
      expect(loadQueue).not.toHaveBeenCalled()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(loadQueue).toHaveBeenCalledOnce()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000)
        window.dispatchEvent(new Event("focus"))
        window.dispatchEvent(new Event("online"))
        document.dispatchEvent(new Event("visibilitychange"))
      })
      expect(loadQueue).toHaveBeenCalledOnce()
      expect(result.current.model.isLoadingQueue).toBe(true)
      await act(async () => {
        finish({ ok: true, value: { ...inquiryQueueFixture, inquiries: [], nextCursor: undefined } })
      })
      expect(result.current.model.visibleInquiries).toEqual([])
      expect(result.current.model.isLoadingQueue).toBe(false)
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it("rejects an obsolete multipage refresh before traversing another page or changing feedback", async () => {
    let finishPage!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["loadQueue"]>>) => void
    const loadQueue = vi
      .fn<InquiryWorkspaceCommands["loadQueue"]>()
      .mockResolvedValueOnce({
        ok: true,
        value: { ...inquiryQueueFixture, inquiries: [summary("tail", "2026-09-01")], nextCursor: undefined },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          ...inquiryQueueFixture,
          inquiries: [summary("new", "2026-10-01")],
          nextCursor: "refresh-page-2",
        },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishPage = resolve
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        value: {
          ...inquiryQueueFixture,
          inquiries: [{ ...summary("current", "2026-10-02"), lifecycle: "closed" as const }],
          nextCursor: "current-next",
          unreadCount: 7,
        },
      })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: { ...inquiryQueueFixture, nextCursor: "initial-next" },
      }),
    )
    await act(() => result.current.actions.onLoadMore())
    let refresh!: Promise<void>
    await act(async () => {
      refresh = result.current.actions.onQueueRefresh()
    })
    expect(loadQueue).toHaveBeenCalledTimes(3)
    await act(async () => {
      result.current.actions.onPrimaryFilterChange("closed")
    })
    await act(async () => {
      finishPage({
        ok: true,
        value: {
          ...inquiryQueueFixture,
          inquiries: [summary("obsolete", "2026-10-03")],
          unreadCount: 99,
          nextCursor: "obsolete-next",
        },
      })
      await refresh
    })
    expect(loadQueue).toHaveBeenCalledTimes(4)
    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual(["current"])
    expect(result.current.model.nextCursor).toBe("current-next")
    expect(result.current.model.totalUnreadCount).toBe(7)
    expect(result.current.model.isLoadingQueue).toBe(false)
    expect(result.current.model.queueError).toBeUndefined()
  })

  it("preserves failed continuation recovery when background triggers arrive", async () => {
    const loadQueue = vi
      .fn<InquiryWorkspaceCommands["loadQueue"]>()
      .mockResolvedValue({ ok: false, error: { code: "service-unavailable" } })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: { ...inquiryQueueFixture, nextCursor: "failed-page" },
      }),
    )
    await act(() => result.current.actions.onLoadMore())
    await act(async () => {
      window.dispatchEvent(new Event("focus"))
    })
    expect(loadQueue).toHaveBeenCalledOnce()
    expect(result.current.model.queueOperation).toBe("append")
    await act(() => result.current.actions.onQueueRefresh())
    expect(loadQueue.mock.calls.map(([query]) => query.cursor)).toEqual(["failed-page", "failed-page"])
  })

  it("does not select the first inquiry automatically", () => {
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands(),
        snapshot: inquiryQueueFixture,
      }),
    )

    expect(result.current.model.visibleInquiries.length).toBeGreaterThan(0)
    expect(result.current.model.selectedInquiry).toBeUndefined()
    expect(result.current.model.detailStatus).toBe("idle")
  })

  it("loads an explicit inquiry and applies a handling-status change to that detail", async () => {
    const changeState = vi.fn(createCommands().changeState)
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ changeState }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.guest.id)
    })
    expect(result.current.model.selectedInquiry?.id).toBe(inquiryDetailFixtures.guest.id)

    await act(async () => {
      await result.current.actions.onHandlingStatusChange("in_review")
    })

    expect(changeState).toHaveBeenCalledWith({
      action: "set-handling-status",
      expectedRevision: inquiryDetailFixtures.guest.revision,
      handlingStatus: "in_review",
      inquiryId: inquiryDetailFixtures.guest.id,
    })
    expect(result.current.model.selectedInquiry?.handlingStatus).toBe("in_review")
  })

  it("projects render-ready same-origin attachment links for the selected timeline", async () => {
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands(),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })

    expect(result.current.model).toMatchObject({
      attachmentAccessPaths: {
        "attachment-1": {
          download:
            "/api/dashboard/clinics/clinic-1/inquiries/attachments/download?attachmentId=attachment-1",
          preview: "/api/dashboard/clinics/clinic-1/inquiries/attachments/preview?attachmentId=attachment-1",
        },
      },
    })
  })

  it("purges a foreign deep-link selection without breaking the queue", async () => {
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands(),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect("inquiry-foreign-clinic")
    })

    expect(result.current.model.selectedInquiry).toBeUndefined()
    expect(result.current.model.selectedInquiryId).toBeUndefined()
    expect(result.current.model.visibleInquiries.length).toBeGreaterThan(0)
  })

  it("refreshes every loaded page until shifted tail inquiries are recovered", async () => {
    const inquiryA = summary("a", "2026-08-24T09:00:00.000Z")
    const inquiryB = summary("b", "2026-08-24T08:00:00.000Z")
    const inquiryC = summary("c", "2026-08-24T07:00:00.000Z")
    const inquiryD = summary("d", "2026-08-24T06:00:00.000Z")
    const inquiryX = summary("x", "2026-08-24T10:00:00.000Z")
    const initialSnapshot = {
      changeCursor: "initial-cursor",
      inquiries: [inquiryA, inquiryB],
      nextCursor: "initial-page-2",
      status: "ready",
      unchanged: false,
      unreadCount: 2,
    } satisfies PatientInquiryQueueSnapshot
    const cursors: (string | undefined)[] = []
    let refreshing = false
    const loadQueue: InquiryWorkspaceCommands["loadQueue"] = async (query) => {
      cursors.push(query.cursor)
      if (query.cursor === "initial-page-2") {
        refreshing = true
        return {
          ok: true,
          value: {
            changeCursor: "loaded-window",
            inquiries: [inquiryC, inquiryD],
            status: "ready",
            unchanged: false,
            unreadCount: 4,
          },
        }
      }
      if (refreshing && !query.cursor) {
        return {
          ok: true,
          value: {
            changeCursor: "refresh-1",
            inquiries: [inquiryX, inquiryA],
            nextCursor: "refresh-page-2",
            status: "ready",
            unchanged: false,
            unreadCount: 5,
          },
        }
      }
      if (query.cursor === "refresh-page-2") {
        return {
          ok: true,
          value: {
            changeCursor: "refresh-2",
            inquiries: [inquiryB, inquiryC],
            nextCursor: "refresh-page-3",
            status: "ready",
            unchanged: false,
            unreadCount: 5,
          },
        }
      }
      if (query.cursor === "refresh-page-3") {
        return {
          ok: true,
          value: {
            changeCursor: "refresh-3",
            inquiries: [inquiryD],
            status: "ready",
            unchanged: false,
            unreadCount: 5,
          },
        }
      }
      return { ok: true, value: initialSnapshot }
    }
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: initialSnapshot,
      }),
    )

    await act(async () => {
      await result.current.actions.onLoadMore()
    })
    await act(async () => {
      await result.current.actions.onQueueRefresh()
    })

    const visibleIds = result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)
    expect(visibleIds).toEqual(["x", "a", "b", "c", "d"])
    expect(new Set(visibleIds).size).toBe(visibleIds.length)
    expect(cursors).toEqual(["initial-page-2", undefined, "refresh-page-2", "refresh-page-3"])
  })

  it("recovers an inserted item after a previously loaded window larger than 20 pages", async () => {
    const oldInquiries = Array.from({ length: 21 }, (_, index) =>
      summary(`old-${index}`, `2026-08-${String(23 - index).padStart(2, "0")}T08:00:00.000Z`),
    )
    const inserted = summary("inserted", "2026-08-24T10:30:00.000Z")
    const initialSnapshot = {
      changeCursor: "old-window-0",
      inquiries: [oldInquiries[0]!],
      nextCursor: "old-page-1",
      status: "ready",
      unchanged: false,
      unreadCount: 21,
    } satisfies PatientInquiryQueueSnapshot
    let refreshing = false
    let refreshPageRequests = 0
    const loadQueue: InquiryWorkspaceCommands["loadQueue"] = async (query) => {
      if (!refreshing) {
        if (!query.cursor) return { ok: true, value: initialSnapshot }
        const index = Number(query.cursor.replace("old-page-", ""))
        return {
          ok: true,
          value: {
            changeCursor: `old-window-${index}`,
            inquiries: [oldInquiries[index]!],
            ...(index < 20 ? { nextCursor: `old-page-${index + 1}` } : {}),
            status: "ready",
            unchanged: false,
            unreadCount: 21,
          },
        }
      }

      refreshPageRequests += 1
      if (!query.cursor) {
        return {
          ok: true,
          value: {
            changeCursor: "new-window-0",
            inquiries: [inserted],
            nextCursor: "new-page-1",
            status: "ready",
            unchanged: false,
            unreadCount: 22,
          },
        }
      }
      const index = Number(query.cursor.replace("new-page-", "")) - 1
      return {
        ok: true,
        value: {
          changeCursor: `new-window-${index + 1}`,
          inquiries: [oldInquiries[index]!],
          ...(index < 20 ? { nextCursor: `new-page-${index + 2}` } : {}),
          status: "ready",
          unchanged: false,
          unreadCount: 22,
        },
      }
    }
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: initialSnapshot,
      }),
    )

    for (let page = 1; page <= 20; page += 1) {
      await act(async () => {
        await result.current.actions.onLoadMore()
      })
    }
    expect(result.current.model.visibleInquiries).toHaveLength(21)

    refreshing = true
    await act(async () => {
      await result.current.actions.onQueueRefresh()
    })

    const visibleIds = result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)
    expect(visibleIds).toEqual(["inserted", ...oldInquiries.map(({ id }) => id)])
    expect(new Set(visibleIds).size).toBe(22)
    expect(refreshPageRequests).toBe(22)
  })

  it("keeps every loaded page when the request-bound first-page cursor is unchanged", async () => {
    const inquiryA = summary("stable-a", "2026-08-24T09:00:00.000Z")
    const inquiryB = summary("stable-b", "2026-08-24T08:00:00.000Z")
    const initialSnapshot = {
      changeCursor: "stable-first-page",
      inquiries: [inquiryA],
      nextCursor: "stable-page-2",
      status: "ready",
      unchanged: false,
      unreadCount: 2,
    } satisfies PatientInquiryQueueSnapshot
    const loadQueue = vi.fn<InquiryWorkspaceCommands["loadQueue"]>(async (query) => {
      if (query.cursor === "stable-page-2") {
        return {
          ok: true,
          value: {
            changeCursor: "stable-second-page",
            inquiries: [inquiryB],
            status: "ready",
            unchanged: false,
            unreadCount: 2,
          },
        }
      }
      expect(query.knownChangeCursor).toBe("stable-first-page")
      return {
        ok: true,
        value: {
          changeCursor: "stable-first-page",
          inquiries: [],
          status: "ready",
          unchanged: true,
          unreadCount: 17,
        },
      }
    })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: initialSnapshot,
      }),
    )

    await act(async () => {
      await result.current.actions.onLoadMore()
    })
    await act(async () => {
      await result.current.actions.onQueueRefresh()
    })

    expect(result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual([
      inquiryA.id,
      inquiryB.id,
    ])
    expect(result.current.model.nextCursor).toBeUndefined()
    expect(result.current.model.totalUnreadCount).toBe(17)
    expect(loadQueue).toHaveBeenCalledTimes(2)
  })

  it.each(["access-denied", "not-found"] as const)(
    "purges the selected inquiry workspace when read-position returns %s",
    async (code) => {
      const inquiry = { ...inquiryDetailFixtures.open, unread: { count: 0, isUnread: false } }
      const loadDetail: InquiryWorkspaceCommands["loadDetail"] = async () => ({
        ok: true,
        value: { changeCursor: inquiry.changeCursor, inquiry, unchanged: false },
      })
      const changeReadPosition: InquiryWorkspaceCommands["changeReadPosition"] = async () => ({
        error: { code },
        ok: false,
      })
      const { result } = renderHook(() =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ changeReadPosition, loadDetail }),
          snapshot: inquiryQueueFixture,
        }),
      )

      await act(async () => {
        await result.current.actions.onInquirySelect(inquiry.id)
      })
      act(() => result.current.actions.onDraftChange("Synthetic draft that must be purged."))
      await act(async () => {
        await result.current.actions.onAttachmentSelect(
          new File(["synthetic"], "scan.pdf", { type: "application/pdf" }),
        )
      })

      await act(async () => {
        await result.current.actions.onMarkReadToggle()
      })

      expect(result.current.model.selectedInquiry).toBeUndefined()
      expect(result.current.model.selectedInquiryId).toBeUndefined()
      expect(result.current.model.draft).toBe("")
      expect(result.current.model.attachment).toBeUndefined()
      expect(result.current.model.hasUnsavedDrafts).toBe(false)
    },
  )

  it.each([
    ["valid", new File(["replacement"], "replacement.pdf", { type: "application/pdf" }), "ready"],
    ["invalid", new File(["replacement"], "replacement.zip", { type: "application/zip" }), "invalid"],
  ] as const)(
    "discards the previous ready draft before a %s attachment replacement",
    async (_, file, status) => {
      const createAttachmentDraft: InquiryWorkspaceCommands["createAttachmentDraft"] = async ({ file }) => ({
        ok: true,
        value: {
          draftId: `draft-${file.name}`,
          expiresAt: "2026-08-25T10:00:00.000Z",
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          status: "ready",
        },
      })
      const discardAttachmentDraft = vi.fn(createCommands().discardAttachmentDraft)
      const { result } = renderHook(() =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ createAttachmentDraft, discardAttachmentDraft }),
          snapshot: inquiryQueueFixture,
        }),
      )

      await act(async () => {
        await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
      })
      await act(async () => {
        await result.current.actions.onAttachmentSelect(
          new File(["first"], "first.pdf", { type: "application/pdf" }),
        )
      })
      await act(async () => {
        await result.current.actions.onAttachmentSelect(file)
      })

      expect(discardAttachmentDraft).toHaveBeenCalledWith({
        draftId: "draft-first.pdf",
        inquiryId: inquiryDetailFixtures.open.id,
      })
      expect(result.current.model.attachment?.status).toBe(status)
    },
  )

  it.each(["close", "spam"] as const)(
    "discards a ready attachment after a confirmed successful %s action",
    async (action) => {
      const discardAttachmentDraft = vi.fn(createCommands().discardAttachmentDraft)
      const { result } = renderHook(() =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ discardAttachmentDraft }),
          snapshot: inquiryQueueFixture,
        }),
      )

      await act(async () => {
        await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
      })
      await act(async () => {
        await result.current.actions.onAttachmentSelect(
          new File(["synthetic"], "scan.pdf", { type: "application/pdf" }),
        )
      })
      await act(async () => {
        if (action === "close") {
          await result.current.actions.onLifecycleToggle({ draftDiscardConfirmed: true })
        } else {
          await result.current.actions.onSpamToggle({
            draftDiscardConfirmed: true,
            reason: "Synthetic unrelated promotion.",
          })
        }
      })

      expect(result.current.model.attachment).toBeUndefined()
      expect(discardAttachmentDraft).toHaveBeenCalledWith({
        draftId: "synthetic-draft",
        inquiryId: inquiryDetailFixtures.open.id,
      })
    },
  )

  it.each(["close", "spam"] as const)(
    "invalidates a pending upload after a confirmed successful %s action",
    async (action) => {
      type AttachmentDraftResult = Awaited<ReturnType<InquiryWorkspaceCommands["createAttachmentDraft"]>>
      let resolveAttachmentDraft!: (result: AttachmentDraftResult) => void
      const createAttachmentDraft: InquiryWorkspaceCommands["createAttachmentDraft"] = () =>
        new Promise<AttachmentDraftResult>((resolve) => {
          resolveAttachmentDraft = resolve
        })
      const discardAttachmentDraft = vi.fn(createCommands().discardAttachmentDraft)
      const { result } = renderHook(() =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ createAttachmentDraft, discardAttachmentDraft }),
          snapshot: inquiryQueueFixture,
        }),
      )

      await act(async () => {
        await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
      })
      let pendingUpload!: Promise<void>
      act(() => {
        pendingUpload = result.current.actions.onAttachmentSelect(
          new File(["synthetic"], "scan.pdf", { type: "application/pdf" }),
        )
      })
      await act(async () => {
        if (action === "close") {
          await result.current.actions.onLifecycleToggle({ draftDiscardConfirmed: true })
        } else {
          await result.current.actions.onSpamToggle({
            draftDiscardConfirmed: true,
            reason: "Synthetic unrelated promotion.",
          })
        }
      })
      await act(async () => {
        resolveAttachmentDraft({
          ok: true,
          value: {
            draftId: "late-terminal-action-draft",
            expiresAt: "2026-08-25T10:00:00.000Z",
            fileName: "scan.pdf",
            mimeType: "application/pdf",
            sizeBytes: 9,
            status: "ready",
          },
        })
        await pendingUpload
      })

      expect(result.current.model.attachment).toBeUndefined()
      expect(discardAttachmentDraft).toHaveBeenCalledWith({
        draftId: "late-terminal-action-draft",
        inquiryId: inquiryDetailFixtures.open.id,
      })
    },
  )

  it("purges queue, detail, drafts and attachments when queue access is denied", async () => {
    const loadQueue: InquiryWorkspaceCommands["loadQueue"] = async () => ({
      error: { code: "access-denied" },
      ok: false,
    })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    act(() => result.current.actions.onDraftChange("Synthetic reply that must be purged."))
    await act(async () => {
      await result.current.actions.onAttachmentSelect(
        new File(["synthetic"], "scan.pdf", { type: "application/pdf" }),
      )
    })
    expect(result.current.model.hasUnsavedDrafts).toBe(true)
    expect(result.current.model.attachment?.status).toBe("ready")

    await act(async () => {
      await result.current.actions.onQueueRefresh()
    })

    expect(result.current.model.availability).toBe("temporarily-unavailable")
    expect(result.current.model.visibleInquiries).toEqual([])
    expect(result.current.model.selectedInquiry).toBeUndefined()
    expect(result.current.model.draft).toBe("")
    expect(result.current.model.attachment).toBeUndefined()
    expect(result.current.model.hasUnsavedDrafts).toBe(false)
  })

  it("keeps a removed upload empty and discards its late draft", async () => {
    type AttachmentDraftResult = Awaited<ReturnType<InquiryWorkspaceCommands["createAttachmentDraft"]>>
    let resolveAttachmentDraft!: (result: AttachmentDraftResult) => void
    const createAttachmentDraft: InquiryWorkspaceCommands["createAttachmentDraft"] = vi.fn(
      () =>
        new Promise<AttachmentDraftResult>((resolve) => {
          resolveAttachmentDraft = resolve
        }),
    )
    const discardAttachmentDraft = vi.fn(createCommands().discardAttachmentDraft)
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ createAttachmentDraft, discardAttachmentDraft }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })

    let pendingUpload!: Promise<void>
    act(() => {
      pendingUpload = result.current.actions.onAttachmentSelect(
        new File(["synthetic"], "scan.pdf", { type: "application/pdf" }),
      )
    })
    expect(result.current.model.attachment?.status).toBe("uploading")

    await act(async () => {
      await result.current.actions.onAttachmentRemove()
    })
    expect(result.current.model.attachment).toBeUndefined()

    await act(async () => {
      resolveAttachmentDraft({
        ok: true,
        value: {
          draftId: "late-synthetic-draft",
          expiresAt: "2026-08-25T10:00:00.000Z",
          fileName: "scan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 9,
          status: "ready",
        },
      })
      await pendingUpload
    })

    expect(result.current.model.attachment).toBeUndefined()
    expect(discardAttachmentDraft).toHaveBeenCalledWith({
      draftId: "late-synthetic-draft",
      inquiryId: inquiryDetailFixtures.open.id,
    })
  })

  it.each([false, true])(
    "discards clinic drafts and cleans late uploads, departure unmount=%s",
    async (unmountAfterDeparture) => {
      type AttachmentDraftResult = Awaited<ReturnType<InquiryWorkspaceCommands["createAttachmentDraft"]>>
      let resolveAttachmentDraft!: (result: AttachmentDraftResult) => void
      const createAttachmentDraft: InquiryWorkspaceCommands["createAttachmentDraft"] = vi.fn(
        () =>
          new Promise<AttachmentDraftResult>((resolve) => {
            resolveAttachmentDraft = resolve
          }),
      )
      const discardAttachmentDraft = vi.fn(createCommands().discardAttachmentDraft)
      const { result, unmount } = renderHook(() =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ createAttachmentDraft, discardAttachmentDraft }),
          snapshot: inquiryQueueFixture,
        }),
      )

      await act(async () => {
        await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
      })

      let pendingUpload!: Promise<void>
      act(() => {
        pendingUpload = result.current.actions.onAttachmentSelect(
          new File(["synthetic"], "scan.pdf", { type: "application/pdf" }),
        )
      })
      expect(result.current.model.attachment?.status).toBe("uploading")

      act(() => {
        expect(result.current.discardUnfinishedWork()).toBe(true)
      })
      expect(result.current.model.hasUnsavedDrafts).toBe(false)
      if (unmountAfterDeparture) unmount()
      expect(result.current.model.attachment).toBeUndefined()

      await act(async () => {
        resolveAttachmentDraft({
          ok: true,
          value: {
            draftId: "late-synthetic-draft",
            expiresAt: "2026-08-25T10:00:00.000Z",
            fileName: "scan.pdf",
            mimeType: "application/pdf",
            sizeBytes: 9,
            status: "ready",
          },
        })
        await pendingUpload
      })

      expect(result.current.model.attachment).toBeUndefined()
      expect(discardAttachmentDraft).toHaveBeenCalledWith({
        draftId: "late-synthetic-draft",
        inquiryId: inquiryDetailFixtures.open.id,
      })
    },
  )

  it("projects a parallel close immediately and converts the retained reply only on request", async () => {
    const current = {
      ...inquiryDetailFixtures.open,
      actions: { ...inquiryDetailFixtures.open.actions, canReply: false },
      lifecycle: "closed" as const,
      revision: inquiryDetailFixtures.open.revision + 1,
    }
    const sendExternalMessage: InquiryWorkspaceCommands["sendExternalMessage"] = async () => ({
      error: { code: "conflict", current },
      ok: false,
    })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ sendExternalMessage }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    act(() => result.current.actions.onDraftChange("Synthetic reply preserved after parallel close."))
    await act(async () => {
      await result.current.actions.onSend()
    })

    expect(result.current.model.selectedInquiry).toMatchObject({
      lifecycle: "closed",
      revision: current.revision,
    })
    expect(result.current.model.blockedReplyDraft).toBe("Synthetic reply preserved after parallel close.")
    expect(result.current.model.activeComposerMode).toBe("note")
    expect(result.current.model.draft).toBe("")

    act(() => result.current.actions.onReplyDraftConvertToNote())
    expect(result.current.model.blockedReplyDraft).toBeUndefined()
    expect(result.current.model.draft).toBe("Synthetic reply preserved after parallel close.")
  })

  it("uses the authoritative global unread count and updates it after a personal read", async () => {
    const snapshot = { ...inquiryQueueFixture, unreadCount: 20 }
    const { result } = renderHook(() =>
      useInquiryQueueController({ clinicId: "clinic-1", commands: createCommands(), snapshot }),
    )

    expect(result.current.model.totalUnreadCount).toBe(20)
    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    expect(result.current.model.totalUnreadCount).toBe(19)
  })

  it("replaces the global unread count on queue refresh", async () => {
    const loadQueue: InquiryWorkspaceCommands["loadQueue"] = async () => ({
      ok: true,
      value: { ...inquiryQueueFixture, unreadCount: 41 },
    })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onQueueRefresh()
    })
    expect(result.current.model.totalUnreadCount).toBe(41)
  })

  it("never marks an inquiry read after its stale detail request loses selection", async () => {
    type DetailResult = Awaited<ReturnType<InquiryWorkspaceCommands["loadDetail"]>>
    const resolvers = new Map<string, (value: DetailResult) => void>()
    const loadDetail: InquiryWorkspaceCommands["loadDetail"] = ({ inquiryId }) =>
      new Promise<DetailResult>((resolve) => resolvers.set(inquiryId, resolve))
    const changeReadPosition = vi.fn(createCommands().changeReadPosition)
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ changeReadPosition, loadDetail }),
        snapshot: inquiryQueueFixture,
      }),
    )

    let firstRequest!: Promise<void>
    let secondRequest!: Promise<void>
    act(() => {
      firstRequest = result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
      secondRequest = result.current.actions.onInquirySelect(inquiryDetailFixtures.guest.id)
    })
    await act(async () => {
      resolvers.get(inquiryDetailFixtures.guest.id)?.({
        ok: true,
        value: {
          changeCursor: inquiryDetailFixtures.guest.changeCursor,
          inquiry: inquiryDetailFixtures.guest,
          unchanged: false,
        },
      })
      await secondRequest
    })
    await act(async () => {
      resolvers.get(inquiryDetailFixtures.open.id)?.({
        ok: true,
        value: {
          changeCursor: inquiryDetailFixtures.open.changeCursor,
          inquiry: inquiryDetailFixtures.open,
          unchanged: false,
        },
      })
      await firstRequest
    })

    expect(changeReadPosition).toHaveBeenCalledTimes(1)
    expect(changeReadPosition).toHaveBeenCalledWith(
      expect.objectContaining({ inquiryId: inquiryDetailFixtures.guest.id }),
    )
    expect(result.current.model.selectedInquiry?.id).toBe(inquiryDetailFixtures.guest.id)
  })

  it("marks read only after the selected inquiry is projected in the active visible workspace", async () => {
    const changeReadPosition = vi.fn(createCommands().changeReadPosition)
    const { rerender, result } = renderHook(
      ({ isActive }) =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ changeReadPosition }),
          isActive,
          snapshot: inquiryQueueFixture,
        }),
      { initialProps: { isActive: false } },
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    expect(result.current.model.selectedInquiry?.id).toBe(inquiryDetailFixtures.open.id)
    expect(changeReadPosition).not.toHaveBeenCalled()

    rerender({ isActive: true })
    await vi.waitFor(() => expect(changeReadPosition).toHaveBeenCalledTimes(1))
    expect(changeReadPosition).toHaveBeenCalledWith({
      activityId: inquiryDetailFixtures.open.timeline.at(-1)?.id,
      inquiryId: inquiryDetailFixtures.open.id,
      mode: "read",
    })
  })

  it("does not mark projected or manually refreshed detail read while the document is hidden", async () => {
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, "visibilityState")
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" })
    const changeReadPosition = vi.fn(createCommands().changeReadPosition)
    const { result, unmount } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ changeReadPosition }),
        isActive: true,
        snapshot: inquiryQueueFixture,
      }),
    )

    try {
      await act(async () => {
        await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
        await result.current.actions.onRefresh()
      })
      expect(changeReadPosition).not.toHaveBeenCalled()

      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
      act(() => document.dispatchEvent(new Event("visibilitychange")))
      await vi.waitFor(() => expect(changeReadPosition).toHaveBeenCalledTimes(1))
    } finally {
      unmount()
      if (visibilityDescriptor) Object.defineProperty(document, "visibilityState", visibilityDescriptor)
    }
  })

  it("keeps new activity unread when it arrives through visible detail polling", async () => {
    vi.useFakeTimers()
    const initial = {
      ...inquiryDetailFixtures.open,
      actions: { ...inquiryDetailFixtures.open.actions, canMarkRead: false, canMarkUnread: true },
      unread: { count: 0, isUnread: false },
    }
    const polled = {
      ...initial,
      actions: { ...initial.actions, canMarkRead: true, canMarkUnread: false },
      changeCursor: "poll-change-2",
      timeline: [
        ...initial.timeline,
        {
          author: { kind: "patient" as const, label: "Patient" },
          body: "New synthetic activity.",
          createdAt: "2026-08-24T12:00:00.000Z",
          id: "polled-activity-2",
          kind: "external-message" as const,
          timeLabel: "12:00",
        },
      ],
      unread: { count: 1, isUnread: true },
    }
    const loadDetail = vi
      .fn<InquiryWorkspaceCommands["loadDetail"]>()
      .mockResolvedValueOnce({
        ok: true,
        value: { changeCursor: initial.changeCursor, inquiry: initial, unchanged: false },
      })
      .mockResolvedValue({
        ok: true,
        value: { changeCursor: polled.changeCursor, inquiry: polled, unchanged: false },
      })
    const changeReadPosition = vi.fn(createCommands().changeReadPosition)
    const { result, unmount } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ changeReadPosition, loadDetail }),
        isActive: true,
        snapshot: inquiryQueueFixture,
      }),
    )

    try {
      await act(async () => {
        await result.current.actions.onInquirySelect(initial.id)
      })
      expect(changeReadPosition).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_000)
      })

      expect(result.current.model.selectedInquiry).toMatchObject({
        changeCursor: "poll-change-2",
        unread: { isUnread: true },
      })
      expect(changeReadPosition).not.toHaveBeenCalled()
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it("surfaces a safe manual read-position failure", async () => {
    const changeReadPosition: InquiryWorkspaceCommands["changeReadPosition"] = async () => ({
      error: { code: "service-unavailable" },
      ok: false,
    })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ changeReadPosition }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(closedInquiryFixture.id)
    })
    await act(async () => {
      await result.current.actions.onMarkReadToggle()
    })
    expect(result.current.model.mutationError).toBe("The inquiry service is temporarily unavailable.")
  })

  it("reports the selected inquiry through the session-loss callback after purging protected state", async () => {
    const onSessionLost = vi.fn()
    const loadQueue: InquiryWorkspaceCommands["loadQueue"] = async () => ({
      error: { code: "unauthorized" },
      ok: false,
    })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        onSessionLost,
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    act(() => result.current.actions.onDraftChange("Protected synthetic draft."))
    await act(async () => {
      await result.current.actions.onQueueRefresh()
    })

    expect(onSessionLost).toHaveBeenCalledWith(inquiryDetailFixtures.open.id)
    expect(result.current.model.selectedInquiry).toBeUndefined()
    expect(result.current.model.hasUnsavedDrafts).toBe(false)
  })

  it("consumes only semantic auth outcomes during contact reauthentication", async () => {
    const reauthenticateSession = vi.fn(async () => ({ status: "invalid-credentials" as const }))
    const revealContact = vi.fn<InquiryWorkspaceCommands["revealContact"]>(async () => ({
      error: { code: "reauthentication-required" },
      ok: false,
    }))
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ revealContact }),
        reauthenticateSession,
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(spamInquiryFixture.id)
    })
    await act(async () => {
      await result.current.actions.onContactReveal()
    })
    await act(async () => {
      await result.current.actions.onContactReauthenticate("wrong-password")
    })

    expect(reauthenticateSession).toHaveBeenCalledWith("wrong-password")
    expect(result.current.model.contactReauthentication).toMatchObject({ status: "invalid" })
  })

  it("reuses the same idempotency key after an ambiguous service failure", async () => {
    const sendExternalMessage = vi
      .fn<InquiryWorkspaceCommands["sendExternalMessage"]>()
      .mockResolvedValueOnce({ error: { code: "service-unavailable" }, ok: false })
      .mockResolvedValueOnce({ ok: true, value: { inquiry: inquiryDetailFixtures.open } })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ sendExternalMessage }),
        snapshot: inquiryQueueFixture,
      }),
    )

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    act(() => result.current.actions.onDraftChange("Retry this exact synthetic reply."))
    await act(async () => {
      await result.current.actions.onSend()
      await result.current.actions.onSend()
    })

    expect(sendExternalMessage).toHaveBeenCalledTimes(2)
    expect(sendExternalMessage.mock.calls[0]?.[0].idempotencyKey).toBe(
      sendExternalMessage.mock.calls[1]?.[0].idempotencyKey,
    )
  })

  it("retains the selected file for retry and hides reply attachments in note mode", async () => {
    const createAttachmentDraft = vi
      .fn<InquiryWorkspaceCommands["createAttachmentDraft"]>()
      .mockResolvedValueOnce({ error: { code: "service-unavailable" }, ok: false })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          draftId: "retry-draft",
          expiresAt: "2026-08-25T10:00:00.000Z",
          fileName: "retry.pdf",
          mimeType: "application/pdf",
          sizeBytes: 9,
          status: "ready",
        },
      })
    const { result } = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ createAttachmentDraft }),
        snapshot: inquiryQueueFixture,
      }),
    )
    const file = new File(["synthetic"], "retry.pdf", { type: "application/pdf" })

    await act(async () => {
      await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    await act(async () => {
      await result.current.actions.onAttachmentSelect(file)
    })
    expect(result.current.model.attachment?.status).toBe("failed")
    act(() => result.current.actions.onComposerModeChange("note"))
    expect(result.current.model.attachment).toBeUndefined()
    act(() => result.current.actions.onComposerModeChange("reply"))
    expect(result.current.model.attachment?.status).toBe("failed")
    await act(async () => {
      await result.current.actions.onAttachmentRetry()
    })

    expect(createAttachmentDraft.mock.calls[0]?.[0].file).toBe(file)
    expect(createAttachmentDraft.mock.calls[1]?.[0].file).toBe(file)
    expect(result.current.model.attachment?.status).toBe("ready")
  })

  it.each(["create", "discard"] as const)(
    "purges all protected inquiry state after definitive attachment %s access loss",
    async (phase) => {
      const createAttachmentDraft: InquiryWorkspaceCommands["createAttachmentDraft"] = async ({ file }) =>
        phase === "create"
          ? { error: { code: "access-denied" }, ok: false }
          : {
              ok: true,
              value: {
                draftId: "access-loss-draft",
                expiresAt: "2026-08-25T10:00:00.000Z",
                fileName: file.name,
                mimeType: file.type,
                sizeBytes: file.size,
                status: "ready",
              },
            }
      const discardAttachmentDraft: InquiryWorkspaceCommands["discardAttachmentDraft"] = async () =>
        phase === "discard"
          ? { error: { code: "access-denied" }, ok: false }
          : { ok: true, value: { discarded: true } }
      const { result } = renderHook(() =>
        useInquiryQueueController({
          clinicId: "clinic-1",
          commands: createCommands({ createAttachmentDraft, discardAttachmentDraft }),
          snapshot: inquiryQueueFixture,
        }),
      )

      await act(async () => {
        await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
      })
      act(() => result.current.actions.onDraftChange("Protected synthetic draft."))
      await act(async () => {
        await result.current.actions.onAttachmentSelect(
          new File(["synthetic"], "access.pdf", { type: "application/pdf" }),
        )
        if (phase === "discard") await result.current.actions.onAttachmentRemove()
      })

      expect(result.current.model.availability).toBe("temporarily-unavailable")
      expect(result.current.model.visibleInquiries).toEqual([])
      expect(result.current.model.selectedInquiry).toBeUndefined()
      expect(result.current.model.hasUnsavedDrafts).toBe(false)
    },
  )
})

it("protects actual reply and attachment work before source access loss and cleans it only on explicit discard", async () => {
  let protectedWork: import("@/lib/editor-departure").ProtectedEditorWork | void
  const discardAttachmentDraft = vi
    .fn<InquiryWorkspaceCommands["discardAttachmentDraft"]>()
    .mockResolvedValue({ ok: true, value: { discarded: true } })
  const { result } = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      snapshot: inquiryQueueFixture,
      commands: createCommands({
        discardAttachmentDraft,
        sendExternalMessage: async () => ({ ok: false, error: { code: "access-denied" } }),
      }),
      onAccessLost: () => {
        protectedWork = result.current.protectUnfinishedWork()
      },
    }),
  )
  await act(async () => {
    await result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
  })
  act(() => result.current.actions.onDraftChange("Protected actual reply before revocation."))
  await act(async () => {
    await result.current.actions.onAttachmentSelect(
      new File(["synthetic"], "private.pdf", { type: "application/pdf" }),
    )
  })
  await act(async () => {
    await result.current.actions.onSend()
  })
  expect(result.current.model.selectedInquiry).toBeUndefined()
  expect(protectedWork!.draft).toMatchObject({
    drafts: { [inquiryDetailFixtures.open.id]: { reply: "Protected actual reply before revocation." } },
  })
  expect(discardAttachmentDraft).not.toHaveBeenCalled()
  await act(async () => {
    await protectedWork!.discard()
  })
  expect(discardAttachmentDraft).toHaveBeenCalledWith({
    inquiryId: inquiryDetailFixtures.open.id,
    draftId: "synthetic-draft",
  })
})

it("retains an actual pending file privately and cleans a late original-clinic upload after restriction unmount", async () => {
  type UploadResult = Awaited<ReturnType<InquiryWorkspaceCommands["createAttachmentDraft"]>>
  let resolveUpload!: (result: UploadResult) => void
  const createAttachmentDraft: InquiryWorkspaceCommands["createAttachmentDraft"] = () =>
    new Promise((resolve) => {
      resolveUpload = resolve
    })
  const discardAttachmentDraft = vi.fn(createCommands().discardAttachmentDraft)
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "original-clinic",
      commands: createCommands({ createAttachmentDraft, discardAttachmentDraft }),
      snapshot: inquiryQueueFixture,
    }),
  )
  await act(async () => {
    await hook.result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
  })
  const file = new File(["synthetic original file"], "private.pdf", { type: "application/pdf" })
  let pending!: Promise<void>
  act(() => {
    pending = hook.result.current.actions.onAttachmentSelect(file)
  })
  const captured = hook.result.current.protectUnfinishedWork()
  hook.unmount()
  expect(captured?.draft).toMatchObject({ files: new Map([[inquiryDetailFixtures.open.id, file]]) })
  expect(discardAttachmentDraft).not.toHaveBeenCalled()
  await act(async () => {
    resolveUpload({
      ok: true,
      value: {
        draftId: "late-original-draft",
        expiresAt: "2026-08-25T10:00:00.000Z",
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        status: "ready",
      },
    })
    await pending
  })
  expect(discardAttachmentDraft).toHaveBeenCalledWith({
    inquiryId: inquiryDetailFixtures.open.id,
    draftId: "late-original-draft",
  })
  expect(captured?.draft).toMatchObject({ files: new Map([[inquiryDetailFixtures.open.id, file]]) })
  await captured?.discard()
})

describe("inquiry filter intent", () => {
  it("uses the server snapshot without a foreground request after mount", async () => {
    vi.useFakeTimers()
    const loadQueue = vi.fn(createCommands().loadQueue)
    const hook = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )
    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(loadQueue).not.toHaveBeenCalled()
      expect(hook.result.current.model.isLoadingQueue).toBe(false)
    } finally {
      hook.unmount()
      vi.useRealTimers()
    }
  })
})

it("starts primary filters promptly while retaining the last successful results", async () => {
  const loadQueue = vi.fn<InquiryWorkspaceCommands["loadQueue"]>(() => new Promise(() => {}))
  const { result } = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({ loadQueue }),
      snapshot: inquiryQueueFixture,
    }),
  )
  const previous = result.current.model.visibleInquiries
  act(() => result.current.actions.onPrimaryFilterChange("closed"))
  expect(loadQueue).toHaveBeenCalledWith(expect.objectContaining({ lifecycle: "closed" }))
  expect(result.current.model.isLoadingQueue).toBe(true)
  expect(result.current.model.visibleInquiries).toEqual(previous)
})

function delayedQueue() {
  type Result = Awaited<ReturnType<InquiryWorkspaceCommands["loadQueue"]>>
  const requests: {
    query: Parameters<InquiryWorkspaceCommands["loadQueue"]>[0]
    resolve: (value: Result) => void
    reject: (reason: Error) => void
  }[] = []
  const loadQueue = vi.fn<InquiryWorkspaceCommands["loadQueue"]>(
    (query) => new Promise((resolve, reject) => requests.push({ query, resolve, reject })),
  )
  return { loadQueue, requests }
}

it.each(["changed-cursor", inquiryQueueFixture.changeCursor])(
  "keeps the latest search when obsolete requests finish, with cursor %s",
  async (changeCursor) => {
    vi.useFakeTimers()
    const { loadQueue, requests } = delayedQueue()
    const hook = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: inquiryQueueFixture,
      }),
    )
    try {
      act(() => hook.result.current.actions.onSearchQueryChange("A"))
      expect(hook.result.current.model.isLoadingQueue).toBe(true)
      expect(loadQueue).not.toHaveBeenCalled()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250)
      })
      act(() => hook.result.current.actions.onSearchQueryChange("B"))
      await act(async () => {
        requests[0].resolve({
          ok: true,
          value: { ...inquiryQueueFixture, inquiries: [], changeCursor: "obsolete" },
        })
      })
      expect(hook.result.current.model.isLoadingQueue).toBe(true)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(250)
      })
      act(() => hook.result.current.actions.onSearchQueryChange(" B "))
      act(() => hook.result.current.actions.onPrimaryFilterChange("open"))
      await act(async () => {
        requests[1].resolve({
          ok: true,
          value: {
            ...inquiryQueueFixture,
            inquiries: [summary("B-result", "2026-08-24")],
            changeCursor,
            unreadCount: 38,
          },
        })
      })
      expect(hook.result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual([
        "B-result",
      ])
      expect(hook.result.current.model.totalUnreadCount).toBe(38)
      expect(hook.result.current.model.isLoadingQueue).toBe(false)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500)
      })
      expect(loadQueue).toHaveBeenCalledTimes(2)
    } finally {
      hook.unmount()
      vi.useRealTimers()
    }
  },
)

it.each(["success", "failure"])("ignores late search A %s after search B completes", async (outcome) => {
  vi.useFakeTimers()
  const { loadQueue, requests } = delayedQueue()
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({ loadQueue }),
      snapshot: inquiryQueueFixture,
    }),
  )
  try {
    act(() => hook.result.current.actions.onSearchQueryChange("A"))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    act(() => hook.result.current.actions.onSearchQueryChange("B"))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    await act(async () => {
      requests[1].resolve({ ok: true, value: { ...inquiryQueueFixture, inquiries: [], changeCursor: "B" } })
    })
    await act(async () => {
      requests[0].resolve(
        outcome === "success"
          ? { ok: true, value: inquiryQueueFixture }
          : { ok: false, error: { code: "service-unavailable" } },
      )
    })
    expect(hook.result.current.model.visibleInquiries).toEqual([])
    expect(hook.result.current.model.queueError).toBeUndefined()
    expect(hook.result.current.model.isLoadingQueue).toBe(false)
  } finally {
    hook.unmount()
    vi.useRealTimers()
  }
})

it.each(["result", "rejection"])(
  "retains selected work after %s failure and retries the current filter without cursors",
  async (failure) => {
    const { loadQueue, requests } = delayedQueue()
    const hook = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({ loadQueue }),
        snapshot: { ...inquiryQueueFixture, nextCursor: "old-page" },
      }),
    )
    await act(async () => {
      await hook.result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
    })
    act(() => hook.result.current.actions.onDraftChange("Reply work"))
    await act(async () => {
      await hook.result.current.actions.onAttachmentSelect(
        new File(["pdf"], "work.pdf", { type: "application/pdf" }),
      )
    })
    act(() => hook.result.current.actions.onComposerModeChange("note"))
    act(() => hook.result.current.actions.onDraftChange("Note work"))
    const previous = hook.result.current.model.visibleInquiries
    act(() => hook.result.current.actions.onPrimaryFilterChange("closed"))
    await act(async () => {
      if (failure === "result") requests[0].resolve({ ok: false, error: { code: "service-unavailable" } })
      else requests[0].reject(new Error("synthetic rejection"))
    })
    expect(hook.result.current.model.isLoadingQueue).toBe(false)
    expect(hook.result.current.model.queueError).toBeTruthy()
    expect(hook.result.current.model.visibleInquiries).toEqual(previous)
    expect(hook.result.current.model.draft).toBe("Note work")
    expect(hook.result.current.model.selectedInquiry?.id).toBe(inquiryDetailFixtures.open.id)
    let retry!: Promise<void>
    act(() => {
      retry = hook.result.current.actions.onQueueRefresh()
    })
    expect(requests[1].query).toEqual({
      handlingStatus: ["submitted", "in_review", "contacted"],
      lifecycle: "closed",
      unreadOnly: false,
    })
    await act(async () => {
      requests[1].resolve({ ok: true, value: { ...inquiryQueueFixture, inquiries: [] } })
      await retry
    })
    expect(hook.result.current.model.queueError).toBeUndefined()
    expect(hook.result.current.model.visibleInquiries).toEqual([])
    act(() => hook.result.current.actions.onComposerModeChange("reply"))
    expect(hook.result.current.model.draft).toBe("Reply work")
    expect(hook.result.current.model.attachment?.fileName).toBe("work.pdf")
  },
)

it.each(["page", "refresh"])("rejects an obsolete %s after a filter change", async (operation) => {
  const { loadQueue, requests } = delayedQueue()
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({ loadQueue }),
      snapshot: { ...inquiryQueueFixture, nextCursor: "old-page" },
    }),
  )
  let old!: Promise<void>
  act(() => {
    old =
      operation === "page"
        ? hook.result.current.actions.onLoadMore()
        : hook.result.current.actions.onQueueRefresh()
  })
  act(() => hook.result.current.actions.onStatusFilterChange(["in_review"]))
  expect(requests).toHaveLength(2)
  await act(async () => {
    requests[1].resolve({
      ok: true,
      value: { ...inquiryQueueFixture, inquiries: [], nextCursor: undefined, unreadCount: 19 },
    })
  })
  await act(async () => {
    requests[0].resolve({
      ok: true,
      value: { ...inquiryQueueFixture, nextCursor: "obsolete", unreadCount: 91 },
    })
    await old
  })
  expect(hook.result.current.model.visibleInquiries).toEqual([])
  expect(hook.result.current.model.nextCursor).toBeUndefined()
  expect(hook.result.current.model.totalUnreadCount).toBe(19)
})

it("supersedes a debounced search with an immediate handling filter without duplicate requests", async () => {
  vi.useFakeTimers()
  const { loadQueue, requests } = delayedQueue()
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({ loadQueue }),
      snapshot: inquiryQueueFixture,
    }),
  )
  try {
    act(() => hook.result.current.actions.onSearchQueryChange("notes"))
    act(() => hook.result.current.actions.onStatusFilterChange(["in_review", "contacted"]))
    expect(requests[0].query).toEqual({
      lifecycle: "open",
      unreadOnly: false,
      handlingStatus: ["in_review", "contacted"],
      query: "notes",
    })
    act(() => hook.result.current.actions.onStatusFilterChange(["contacted", "in_review"]))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(loadQueue).toHaveBeenCalledTimes(1)
    await act(async () => {
      requests[0].resolve({ ok: true, value: { ...inquiryQueueFixture, inquiries: [] } })
    })
    expect(hook.result.current.model.isLoadingQueue).toBe(false)
    expect(hook.result.current.model.visibleInquiries).toEqual([])
  } finally {
    hook.unmount()
    vi.useRealTimers()
  }
})

it("refreshes selected detail after a failed filter without reusing the previous result cursor", async () => {
  const { loadQueue, requests } = delayedQueue()
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({ loadQueue }),
      snapshot: inquiryQueueFixture,
    }),
  )
  await act(async () => {
    await hook.result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id)
  })
  act(() => hook.result.current.actions.onPrimaryFilterChange("closed"))
  await act(async () => {
    requests[0].resolve({ ok: false, error: { code: "service-unavailable" } })
  })
  let refresh!: Promise<void>
  act(() => {
    refresh = hook.result.current.actions.onRefresh()
  })
  expect(requests[1].query).not.toHaveProperty("knownChangeCursor")
  await act(async () => {
    requests[1].resolve({ ok: true, value: { ...inquiryQueueFixture, inquiries: [] } })
    await refresh
  })
  expect(hook.result.current.model.visibleInquiries).toEqual([])
})

it("refreshes the current closed results and cursor after an older open inquiry mutation finishes", async () => {
  let finishNote!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["addInternalNote"]>>) => void
  const { loadQueue, requests } = delayedQueue()
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({
        loadQueue,
        addInternalNote: () =>
          new Promise((resolve) => {
            finishNote = resolve
          }),
      }),
      snapshot: inquiryQueueFixture,
    }),
  )
  await act(() => hook.result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id))
  act(() => hook.result.current.actions.onComposerModeChange("note"))
  act(() => hook.result.current.actions.onDraftChange("Internal work"))
  let mutation!: Promise<void>
  act(() => {
    mutation = hook.result.current.actions.onSend()
  })
  act(() => hook.result.current.actions.onPrimaryFilterChange("closed"))
  await act(async () => {
    requests[0].resolve({
      ok: true,
      value: {
        ...inquiryQueueFixture,
        inquiries: [closedInquiryFixture],
        changeCursor: "closed-current",
        nextCursor: "closed-next",
      },
    })
  })
  await act(async () => {
    finishNote({ ok: true, value: { inquiry: inquiryDetailFixtures.open } })
  })
  expect(requests[1].query).toMatchObject({ lifecycle: "closed", knownChangeCursor: "closed-current" })
  await act(async () => {
    requests[1].resolve({
      ok: true,
      value: {
        ...inquiryQueueFixture,
        inquiries: [closedInquiryFixture],
        changeCursor: "closed-refreshed",
        nextCursor: "closed-next",
      },
    })
    await mutation
  })
  expect(hook.result.current.model.lifecycleFilter).toBe("closed")
  expect(hook.result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual([
    closedInquiryFixture.id,
  ])
  expect(hook.result.current.model.nextCursor).toBe("closed-next")
  expect(hook.result.current.model.isLoadingQueue).toBe(false)
  expect(hook.result.current.model.hasPreviousResults).toBe(false)
})

it("keeps a successful server search match absent from the queue preview visible", async () => {
  vi.useFakeTimers()
  const { loadQueue, requests } = delayedQueue()
  const hook = renderHook(() =>
    useInquiryQueueController({
      clinicId: "clinic-1",
      commands: createCommands({ loadQueue }),
      snapshot: inquiryQueueFixture,
    }),
  )
  try {
    act(() => hook.result.current.actions.onSearchQueryChange("attachment-only-term"))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250)
    })
    expect(requests[0].query.query).toBe("attachment-only-term")
    expect(inquiryDetailFixtures.open.lastActivityPreview).not.toContain("attachment-only-term")
    expect(inquiryDetailFixtures.open.originalRequestPreview).not.toContain("attachment-only-term")
    await act(async () => {
      requests[0].resolve({
        ok: true,
        value: {
          ...inquiryQueueFixture,
          inquiries: [inquiryDetailFixtures.open],
          changeCursor: "server-search",
        },
      })
    })
    expect(hook.result.current.model.searchQuery).toBe("attachment-only-term")
    expect(hook.result.current.model.visibleInquiries.map(({ inquiry }) => inquiry.id)).toEqual([
      inquiryDetailFixtures.open.id,
    ])
    expect(hook.result.current.model.hasPreviousResults).toBe(false)
    expect(hook.result.current.model.isLoadingQueue).toBe(false)
  } finally {
    hook.unmount()
    vi.useRealTimers()
  }
})

it.each(["debounce", "request"])(
  "keeps a pending %s authoritative when an older mutation finishes",
  async (phase) => {
    vi.useFakeTimers()
    let finishNote!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["addInternalNote"]>>) => void
    const { loadQueue, requests } = delayedQueue()
    const hook = renderHook(() =>
      useInquiryQueueController({
        clinicId: "clinic-1",
        commands: createCommands({
          loadQueue,
          addInternalNote: () =>
            new Promise((resolve) => {
              finishNote = resolve
            }),
        }),
        snapshot: inquiryQueueFixture,
      }),
    )
    try {
      await act(() => hook.result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id))
      act(() => hook.result.current.actions.onComposerModeChange("note"))
      act(() => hook.result.current.actions.onDraftChange("Internal work"))
      let mutation!: Promise<void>
      act(() => {
        mutation = hook.result.current.actions.onSend()
      })
      act(() => hook.result.current.actions.onSearchQueryChange("current-search"))
      if (phase === "request")
        await act(async () => {
          await vi.advanceTimersByTimeAsync(250)
        })
      await act(async () => {
        finishNote({ ok: true, value: { inquiry: inquiryDetailFixtures.open } })
        await mutation
      })
      expect(loadQueue).toHaveBeenCalledTimes(phase === "request" ? 1 : 0)
      expect(hook.result.current.model.searchQuery).toBe("current-search")
      expect(hook.result.current.model.isLoadingQueue).toBe(true)
      expect(hook.result.current.model.queueOperation).toBe("replace")
      expect(hook.result.current.model.hasPreviousResults).toBe(true)
      if (phase === "debounce")
        await act(async () => {
          await vi.advanceTimersByTimeAsync(250)
        })
      expect(requests[0].query).toMatchObject({ query: "current-search" })
      expect(requests[0].query).not.toHaveProperty("knownChangeCursor")
      await act(async () => {
        requests[0].resolve({
          ok: true,
          value: { ...inquiryQueueFixture, inquiries: [], nextCursor: undefined },
        })
      })
      expect(hook.result.current.model.visibleInquiries).toEqual([])
      expect(hook.result.current.model.isLoadingQueue).toBe(false)
      expect(loadQueue).toHaveBeenCalledTimes(1)
    } finally {
      hook.unmount()
      vi.useRealTimers()
    }
  },
)

it.each(["unmount", "clinic", "session", "access"])(
  "ignores a delayed mutation after %s loss",
  async (loss) => {
    let finishNote!: (value: Awaited<ReturnType<InquiryWorkspaceCommands["addInternalNote"]>>) => void
    const loadQueue = vi.fn<InquiryWorkspaceCommands["loadQueue"]>().mockResolvedValue({
      ok: false,
      error: { code: loss === "session" ? "unauthorized" : "access-denied" },
    })
    const commands = createCommands({
      loadQueue,
      addInternalNote: () =>
        new Promise((resolve) => {
          finishNote = resolve
        }),
    })
    const hook = renderHook(
      ({ clinicId }) => useInquiryQueueController({ clinicId, commands, snapshot: inquiryQueueFixture }),
      { initialProps: { clinicId: "clinic-1" } },
    )
    await act(() => hook.result.current.actions.onInquirySelect(inquiryDetailFixtures.open.id))
    act(() => hook.result.current.actions.onComposerModeChange("note"))
    act(() => hook.result.current.actions.onDraftChange("Internal work"))
    let mutation!: Promise<void>
    act(() => {
      mutation = hook.result.current.actions.onSend()
    })
    if (loss === "unmount") hook.unmount()
    else if (loss === "clinic") hook.rerender({ clinicId: "clinic-2" })
    else await act(() => hook.result.current.actions.onQueueRefresh())
    const readsBeforeCompletion = loadQueue.mock.calls.length
    await act(async () => {
      finishNote({ ok: true, value: { inquiry: inquiryDetailFixtures.open } })
      await mutation
    })
    expect(loadQueue).toHaveBeenCalledTimes(readsBeforeCompletion)
    if (loss === "session" || loss === "access")
      expect(hook.result.current.model.visibleInquiries).toEqual([])
    hook.unmount()
  },
)
