// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useExactClinicOpening } from "@/features/clinic-dashboard/workspace/useExactClinicOpening"

const clinics = [{ id: "clinic-a" }, { id: "clinic-b" }]
const inquiry = {
  requestId: "opening-1",
  clinicId: "clinic-b",
  destination: { kind: "inquiry", inquiryId: "off-page-1" },
} as const
const review = {
  requestId: "opening-2",
  clinicId: "clinic-b",
  destination: { kind: "review", reviewId: "review-2", anchor: { kind: "response", id: "missing-response" } },
} as const

afterEach(cleanup)

describe("exact clinic display continuation", () => {
  it.each([inquiry, review])(
    "waits for the exact committed display of $destination.kind after the authorized transition",
    async (request) => {
      const navigate = vi.fn()
      const requestDeparture = vi.fn((_intent, proceed) => proceed())
      const { result, rerender } = renderHook(
        ({ clinicId }) =>
          useExactClinicOpening({
            principalId: "person-1",
            clinicId,
            authorizedClinics: clinics,
            requestDeparture,
            navigate,
          }),
        { initialProps: { clinicId: "clinic-a" } },
      )
      let outcome: string | undefined
      let pending!: Promise<unknown>
      act(() => {
        pending = result.current.open(request, new AbortController().signal).then((value) => {
          outcome = value
        })
      })
      expect(requestDeparture).toHaveBeenCalledWith(
        "context-change",
        expect.any(Function),
        expect.any(Function),
      )
      expect(navigate).toHaveBeenCalledExactlyOnceWith(
        `/clinics/clinic-b?section=${request.destination.kind === "inquiry" ? "messages&inquiry=off-page-1" : "reviews&review=review-2"}`,
      )
      expect(result.current.request).toBeUndefined()
      rerender({ clinicId: "clinic-b" })
      expect(result.current.request).toEqual(request)
      act(() =>
        result.current.complete({
          requestId: request.requestId,
          kind: request.destination.kind,
          recordId: "other-record",
          status: "displayed",
        }),
      )
      expect(outcome).toBeUndefined()
      await act(async () => {
        result.current.complete({
          requestId: request.requestId,
          kind: request.destination.kind,
          recordId:
            request.destination.kind === "inquiry"
              ? request.destination.inquiryId
              : request.destination.reviewId,
          status: "displayed",
        })
        await pending
      })
      expect(outcome).toBe("displayed")
    },
  )

  it("keeps the current clinic and draft when the shared editor gate declines", async () => {
    const navigate = vi.fn()
    const requestDeparture = vi.fn((_intent, _proceed, cancel) => cancel())
    const { result } = renderHook(() =>
      useExactClinicOpening({
        principalId: "person-1",
        clinicId: "clinic-a",
        authorizedClinics: clinics,
        requestDeparture,
        navigate,
      }),
    )
    await expect(result.current.open(inquiry, new AbortController().signal)).resolves.toBe("cancelled")
    expect(navigate).not.toHaveBeenCalled()
    expect(result.current.request).toBeUndefined()
  })

  it("cancels aborted and superseded opening requests without accepting a late display", async () => {
    const requestDeparture = vi.fn((_intent, proceed) => proceed())
    const { result } = renderHook(() =>
      useExactClinicOpening({
        principalId: "person-1",
        clinicId: "clinic-b",
        authorizedClinics: clinics,
        requestDeparture,
        navigate: vi.fn(),
      }),
    )
    const abort = new AbortController()
    let first!: Promise<unknown>
    let second!: Promise<unknown>
    act(() => {
      first = result.current.open(inquiry, abort.signal)
    })
    act(() => {
      second = result.current.open(review, new AbortController().signal)
    })
    await expect(first).resolves.toBe("cancelled")
    act(() =>
      result.current.complete({
        requestId: inquiry.requestId,
        kind: "inquiry",
        recordId: inquiry.destination.inquiryId,
        status: "displayed",
      }),
    )
    expect(result.current.request).toEqual(review)
    await act(async () => {
      result.current.cancel()
      await second
    })
    expect(result.current.request).toBeUndefined()
  })

  it("refuses an unauthorized target before leaving and invalidates a changed principal", async () => {
    const navigate = vi.fn()
    const requestDeparture = vi.fn((_intent, proceed) => proceed())
    const { result, rerender } = renderHook(
      ({ principalId }) =>
        useExactClinicOpening({
          principalId,
          clinicId: "clinic-a",
          authorizedClinics: clinics,
          requestDeparture,
          navigate,
        }),
      { initialProps: { principalId: "person-1" } },
    )
    await expect(
      result.current.open({ ...inquiry, clinicId: "foreign" }, new AbortController().signal),
    ).resolves.toBe("unavailable")
    expect(requestDeparture).not.toHaveBeenCalled()
    let pending!: Promise<unknown>
    act(() => {
      pending = result.current.open(inquiry, new AbortController().signal)
    })
    rerender({ principalId: "person-2" })
    await expect(pending).resolves.toBe("cancelled")
    expect(result.current.request).toBeUndefined()
  })
})
