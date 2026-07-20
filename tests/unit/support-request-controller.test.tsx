// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useSupportRequestController } from "@/features/clinic-dashboard/support/hooks/useSupportRequestController"
import { emptySupportRequest } from "@/features/clinic-dashboard/support/model/support-request"

describe("support request controller", () => {
  beforeEach(() => vi.useFakeTimers())

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("simulates sending and resets every local field for another request", async () => {
    const { result } = renderHook(() => useSupportRequestController())

    act(() => {
      result.current.actions.update("category", "Technical issue")
      result.current.actions.update("subject", "Profile update failed")
      result.current.actions.update("message", "The clinic profile does not update after I save the changes.")
      result.current.actions.selectScreenshot({
        name: "profile.png",
        size: 1_024,
        type: "image/png",
      })
    })

    let submission: Promise<void> | undefined
    act(() => {
      submission = result.current.actions.submit()
    })
    expect(result.current.model.isSubmitting).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
      await submission
    })
    expect(result.current.model.result?.message).toBe("Demo complete — no support request was sent or saved.")

    act(() => result.current.actions.reset())
    expect(result.current.model.request).toEqual(emptySupportRequest)
    expect(result.current.model.errors).toEqual({})
    expect(result.current.model.result).toBeUndefined()
    expect(result.current.model.isSubmitting).toBe(false)
  })
})
