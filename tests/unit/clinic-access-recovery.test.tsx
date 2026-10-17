// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import { loadClinicDashboardChoices } from "@/features/clinic-dashboard/auth/public"
import { useEditorDepartureGuard } from "@/features/clinic-dashboard/workspace/useEditorDepartureGuard"
import { useClinicAccessRecovery } from "@/features/clinic-dashboard/workspace/useClinicAccessRecovery"

afterEach(cleanup)

it("requires an explicit alternative and preserves private work when discard is declined", async () => {
  const onChoose = vi.fn()
  const loadChoices = async () => ({
    status: "approved" as const,
    context: {
      schemaVersion: "clinic-scope-v1" as const,
      status: "approved" as const,
      principal: { id: "person", displayName: "Synthetic Person", email: "person@example.invalid" },
      clinics: [{ id: "clinic-2", name: "Alternative Clinic", capabilities: [] }],
    },
  })
  const { result } = renderHook(() => {
    const guard = useEditorDepartureGuard()
    const recovery = useClinicAccessRecovery({
      principalId: "person",
      clinicId: "clinic-1",
      section: "messages",
      guard,
      loadChoices,
      onChoose,
      onSessionLost: () => {},
    })
    return { guard, recovery }
  })
  act(() =>
    result.current.guard.setInquiryRequest((_continue, _cancel, intent) =>
      intent === "access-loss"
        ? { draft: { reply: "Protected original clinic reply" }, discard: () => {} }
        : undefined,
    ),
  )
  await act(async () => {
    await result.current.recovery.restrict()
  })
  expect(result.current.recovery.model.choices.map(({ id }) => id)).toEqual(["clinic-2"])
  expect(onChoose).not.toHaveBeenCalled()
  act(() => result.current.recovery.chooseClinic("clinic-2"))
  expect(result.current.recovery.model.pendingClinic?.id).toBe("clinic-2")
  act(() => result.current.recovery.declineDiscard())
  expect(result.current.recovery.model.restricted).toBe(true)
  expect(result.current.guard.protectedWork[0]?.draft).toEqual({ reply: "Protected original clinic reply" })
  expect(onChoose).not.toHaveBeenCalled()
  act(() => result.current.recovery.chooseClinic("clinic-2"))
  await act(async () => {
    await result.current.recovery.confirmDiscard()
  })
  expect(onChoose).toHaveBeenCalledWith("clinic-2", "messages")
  expect(result.current.guard.protectedWork).toEqual([])
})

it("ignores late old choices and clears actual private work on principal change", async () => {
  let resolveChoices!: (value: Awaited<ReturnType<typeof loadClinicDashboardChoices>>) => void
  const loadChoices = vi.fn(
    () =>
      new Promise<Awaited<ReturnType<typeof loadClinicDashboardChoices>>>((resolve) => {
        resolveChoices = resolve
      }),
  )
  const onChoose = vi.fn(),
    onSessionLost = vi.fn(),
    discard = vi.fn()
  const { result, rerender } = renderHook(
    ({ person }) => {
      const guard = useEditorDepartureGuard()
      return {
        guard,
        recovery: useClinicAccessRecovery({
          principalId: person,
          clinicId: "clinic-1",
          section: "reviews",
          guard,
          loadChoices,
          onChoose,
          onSessionLost,
        }),
      }
    },
    { initialProps: { person: "old-person" } },
  )
  act(() =>
    result.current.guard.setReviewRequest((_continue, _cancel, intent) =>
      intent === "access-loss" ? { draft: { body: "Actual old private draft" }, discard } : undefined,
    ),
  )
  let request!: Promise<void>
  act(() => {
    request = result.current.recovery.restrict()
  })
  expect(result.current.guard.protectedWork).toHaveLength(1)
  rerender({ person: "different-person" })
  expect(result.current.guard.protectedWork).toEqual([])
  await act(async () => {})
  expect(discard).toHaveBeenCalledTimes(1)
  await act(async () => {
    resolveChoices({ status: "denied" })
    await request
  })
  expect(result.current.recovery.model.restricted).toBe(false)
  expect(onSessionLost).not.toHaveBeenCalled()
  expect(onChoose).not.toHaveBeenCalled()
})

it("retains the private capsule when original attachment cleanup fails and retries only after confirmation", async () => {
  const discard = vi.fn().mockRejectedValueOnce(new Error("unavailable")).mockResolvedValue(undefined)
  const onChoose = vi.fn()
  const loadChoices = async () => ({
    status: "approved" as const,
    context: {
      schemaVersion: "clinic-scope-v1" as const,
      status: "approved" as const,
      principal: { id: "person", displayName: "Person", email: "person@example.invalid" },
      clinics: [{ id: "clinic-2", name: "Alternative", capabilities: [] }],
    },
  })
  const { result } = renderHook(() => {
    const guard = useEditorDepartureGuard()
    return {
      guard,
      recovery: useClinicAccessRecovery({
        principalId: "person",
        clinicId: "clinic-1",
        section: "messages",
        guard,
        loadChoices,
        onChoose,
        onSessionLost: vi.fn(),
      }),
    }
  })
  act(() =>
    result.current.guard.setInquiryRequest((_continue, _cancel, intent) =>
      intent === "access-loss" ? { draft: { attachment: "original-only" }, discard } : undefined,
    ),
  )
  await act(async () => {
    await result.current.recovery.restrict()
  })
  act(() => result.current.recovery.chooseClinic("clinic-2"))
  await act(async () => {
    await result.current.recovery.confirmDiscard()
  })
  expect(result.current.guard.protectedWork[0]?.draft).toEqual({ attachment: "original-only" })
  expect(result.current.recovery.model.error).toBeTruthy()
  expect(onChoose).not.toHaveBeenCalled()
  await act(async () => {
    await result.current.recovery.confirmDiscard()
  })
  expect(discard).toHaveBeenCalledTimes(2)
  expect(onChoose).toHaveBeenCalledWith("clinic-2", "messages")
})
