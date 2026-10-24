// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useSupportRequestController } from "@/features/clinic-dashboard/support/hooks/useSupportRequestController"
import type { SupportRequestResult } from "@/features/clinic-dashboard/support/model/support-request"
afterEach(cleanup)
describe("support request controller", () => {
  it.each(["failed", "unknown"] as const)(
    "retains inputs after %s and prevents same-tick duplicate submits",
    async (status) => {
      let complete!: (value: SupportRequestResult) => void
      const send = vi.fn(
        () =>
          new Promise<SupportRequestResult>((resolve) => {
            complete = resolve
          }),
      )
      const { result } = renderHook(() => useSupportRequestController(send))
      act(() => {
        result.current.actions.update("subject", "Profile update failed")
        result.current.actions.update("message", "The clinic profile fails to save the changes.")
      })
      let pending!: Promise<void>
      act(() => {
        pending = result.current.actions.submit()
        void result.current.actions.submit()
      })
      expect(result.current.model.isSubmitting).toBe(true)
      expect(send).toHaveBeenCalledTimes(1)
      await act(async () => {
        complete({ status })
        await pending
      })
      expect(result.current.model.result).toEqual({ status })
      expect(result.current.model.request.subject).toBe("Profile update failed")
      expect(result.current.model.request.message).toBe("The clinic profile fails to save the changes.")
      expect(send).toHaveBeenCalledTimes(1)
    },
  )
})
