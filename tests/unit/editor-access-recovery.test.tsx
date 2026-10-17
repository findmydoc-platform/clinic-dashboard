// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { useEditorDepartureGuard } from "@/features/clinic-dashboard/workspace/useEditorDepartureGuard"

import { AddressDialog } from "@/features/clinic-dashboard/clinic-profile/components/molecules/AddressDialog"
import { Reviews } from "@/features/clinic-dashboard/reviews/public"
import {
  createReviewSourceCommandsFixture,
  reviewSourceSnapshotFixture,
} from "@/features/clinic-dashboard/reviews/testing/review-source.fixtures"

afterEach(cleanup)

it("retains the actual inaccessible draft after its editor unregisters until explicit discard", async () => {
  const { result } = renderHook(() => useEditorDepartureGuard())
  const draft = { body: "Private unfinished response for the original clinic." }
  let discarded = false
  act(() =>
    result.current.setReviewRequest((_continue, _cancel, intent) => {
      if (intent === "access-loss")
        return {
          draft,
          discard: () => {
            discarded = true
          },
        }
    }),
  )
  act(() => result.current.protectScope())
  act(() => result.current.setReviewRequest(null))

  expect(result.current.protectedWork).toHaveLength(1)
  expect(result.current.protectedWork[0]?.draft).toEqual({
    body: "Private unfinished response for the original clinic.",
  })
  expect(discarded).toBe(false)

  await act(async () => {
    await result.current.discardProtectedWork()
  })
  expect(discarded).toBe(true)
  expect(result.current.protectedWork).toEqual([])
})

it("protects the real review response body privately before its editor is removed", async () => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false
    },
  })
  const { result } = renderHook(() => useEditorDepartureGuard())
  const editor = render(
    <Reviews
      commands={createReviewSourceCommandsFixture()}
      onNavigationRequestChange={result.current.setReviewRequest}
      showManagement
      snapshot={reviewSourceSnapshotFixture}
    />,
  )
  fireEvent.click(screen.getAllByRole("button", { name: "Respond" })[0]!)
  fireEvent.change(screen.getByRole("textbox", { name: "Clinic response" }), {
    target: { value: "An actual private unfinished response." },
  })
  act(() => result.current.protectScope())
  editor.unmount()
  expect(screen.queryByRole("textbox", { name: "Clinic response" })).toBeNull()
  expect(result.current.protectedWork).toHaveLength(1)
  expect(result.current.protectedWork[0]?.draft).toEqual({ body: "An actual private unfinished response." })
})

it("protects address text that has not been applied to the profile draft", () => {
  const { result } = renderHook(() => useEditorDepartureGuard())
  const editor = render(
    <AddressDialog
      address={{ street: "Original", houseNumber: "1", zipCode: "34000", cityId: "city-1" }}
      cities={[]}
      errors={{}}
      open
      onOpenChange={() => {}}
      onSave={() => {}}
      onNavigationRequestChange={result.current.setProfileRequest}
    />,
  )
  fireEvent.change(screen.getByRole("textbox", { name: "Street" }), {
    target: { value: "Private unapplied address" },
  })
  act(() => result.current.protectScope())
  editor.unmount()
  expect(result.current.protectedWork[0]?.draft).toMatchObject({ street: "Private unapplied address" })
})

it("blocks a normal destination from bypassing protected work after inaccessible editors unregister", () => {
  const { result } = renderHook(() => useEditorDepartureGuard())
  const navigate = vi.fn(),
    cancelled = vi.fn()
  act(() =>
    result.current.setReviewRequest((_continue, _cancel, intent) =>
      intent === "access-loss"
        ? { draft: { body: "Private retained response" }, discard: vi.fn() }
        : undefined,
    ),
  )
  act(() => result.current.protectScope())
  act(() => result.current.setReviewRequest(null))
  act(() => result.current.requestDeparture("destination", navigate, cancelled))
  expect(navigate).not.toHaveBeenCalled()
  expect(cancelled).toHaveBeenCalledTimes(1)
  expect(result.current.protectedWork[0]?.draft).toEqual({ body: "Private retained response" })
})
