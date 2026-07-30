// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useInquiryQueueController } from "@/features/clinic-dashboard/messages/hooks/useInquiryQueueController"
import {
  inquiryQueueFixture,
  secondaryInquiryFixture,
} from "@/features/clinic-dashboard/messages/testing/public"

const multiInquirySnapshot = {
  inquiries: [...inquiryQueueFixture.inquiries, secondaryInquiryFixture],
  status: "ready",
} as const

describe("Inquiry queue controller", () => {
  it("updates the inquiry currently displayed by search", async () => {
    const updateStatus = vi.fn(async ({ inquiryId, status }) => ({
      changedAt: "11:08",
      inquiry: {
        ...secondaryInquiryFixture,
        availableTransitions: ["contacted", "closed", "spam"] as const,
        id: inquiryId,
        status,
      },
    }))
    const { result } = renderHook(() =>
      useInquiryQueueController({
        commands: { updateStatus },
        snapshot: multiInquirySnapshot,
      }),
    )

    act(() => result.current.actions.onSearchQueryChange("Aylin"))
    expect(result.current.model.selectedInquiry?.id).toBe(secondaryInquiryFixture.id)

    await act(() => result.current.actions.onStatusChange("in_review"))

    expect(updateStatus).toHaveBeenCalledWith({
      inquiryId: secondaryInquiryFixture.id,
      status: "in_review",
    })
    expect(result.current.model.selectedInquiry?.status).toBe("in_review")
  })

  it("does not update an inquiry when search has no results", async () => {
    const updateStatus = vi.fn()
    const { result } = renderHook(() =>
      useInquiryQueueController({
        commands: { updateStatus },
        snapshot: multiInquirySnapshot,
      }),
    )

    act(() => result.current.actions.onSearchQueryChange("no matching inquiry"))
    await act(() => result.current.actions.onStatusChange("in_review"))

    expect(result.current.model.selectedInquiry).toBeUndefined()
    expect(updateStatus).not.toHaveBeenCalled()
  })

  it("blocks a second status update and keeps a late error with its inquiry", async () => {
    let rejectUpdate: ((reason?: unknown) => void) | undefined
    const updateStatus = vi.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectUpdate = reject
        }),
    )
    const { result } = renderHook(() =>
      useInquiryQueueController({
        commands: { updateStatus },
        snapshot: multiInquirySnapshot,
      }),
    )

    let firstUpdate: Promise<void> | undefined
    act(() => {
      firstUpdate = result.current.actions.onStatusChange("in_review")
    })
    act(() => result.current.actions.onInquirySelect(secondaryInquiryFixture.id))

    expect(result.current.model.isStatusChangeDisabled).toBe(true)
    expect(result.current.model.isUpdatingStatus).toBe(false)
    await act(() => result.current.actions.onStatusChange("in_review"))
    expect(updateStatus).toHaveBeenCalledTimes(1)

    await act(async () => {
      rejectUpdate?.(new Error("upstream failed"))
      await firstUpdate
    })
    expect(result.current.model.statusError).toBeUndefined()

    act(() => result.current.actions.onInquirySelect(inquiryQueueFixture.inquiries[0]!.id))
    expect(result.current.model.statusError).toContain("could not be updated")
  })
})
