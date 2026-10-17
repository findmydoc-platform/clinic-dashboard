// @vitest-environment jsdom
import { useLayoutEffect, useMemo } from "react"
import { act, cleanup, render } from "@testing-library/react"
import { afterEach, expect, it, vi } from "vitest"
import {
  ClinicWorkspaceLifetimeProvider,
  useClinicWorkspaceLifetime,
  type ClinicWorkspaceLifetime,
} from "@/features/clinic-dashboard/workspace/ClinicWorkspaceLifetime"
import { authenticatedClinicContextFixture as context } from "@/features/clinic-dashboard/workspace/testing/workspace.fixtures"
import { notificationCommandsFixture } from "@/features/clinic-dashboard/notifications/testing/public"

const navigation = vi.hoisted(() => ({ pathname: "/clinics/clinic-a", push: vi.fn(), replace: vi.fn() }))
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => navigation }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  navigation.pathname = "/clinics/clinic-a"
})
let owner!: ClinicWorkspaceLifetime
function Probe() {
  const lifetime = useClinicWorkspaceLifetime()!
  useLayoutEffect(() => {
    owner = lifetime
  })
  return null
}
function Page({
  clinic,
  person = "person",
  lease: suppliedLease,
  section = "messages",
}: {
  clinic: string
  person?: string
  lease?: AbortController
  section?: "messages" | "dashboard"
}) {
  const authenticatedContext = useMemo(
    () => ({
      ...context,
      principal: { ...context.principal, id: person },
      clinic: { ...context.clinic, id: clinic },
    }),
    [person, clinic],
  )
  const lifetime = useClinicWorkspaceLifetime()!
  const register = lifetime.register
  useLayoutEffect(() => {
    const lease = suppliedLease ?? new AbortController()
    register({ authenticatedContext, initialSection: section }, lease.signal)
    return () => lease.abort()
  }, [register, authenticatedContext, suppliedLease, section])
  return null
}
function tree(
  clinic: string,
  person = "person",
  lease?: AbortController,
  section: "messages" | "dashboard" = "messages",
) {
  return (
    <ClinicWorkspaceLifetimeProvider notificationCommands={notificationCommandsFixture}>
      <Probe />
      <Page key={clinic} clinic={clinic} person={person} lease={lease} section={section} />
    </ClinicWorkspaceLifetimeProvider>
  )
}
function choices() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        schemaVersion: "clinic-scope-v1",
        status: "approved",
        principal: { id: "person", displayName: "Person", email: "person@example.invalid" },
        clinics: [{ id: "clinic-b", name: "Alternative", capabilities: [] }],
      }),
    ),
  )
}
it("keeps the original protected draft and recovery across a clinic page remount and declined discard", async () => {
  choices()
  const view = render(tree("clinic-a"))
  const discard = vi.fn()
  act(() =>
    owner.departureGuard.setInquiryRequest((_proceed, _cancel, intent) =>
      intent === "access-loss"
        ? { draft: { body: "Original private reply", attachment: "original-clinic-file" }, discard }
        : undefined,
    ),
  )
  await act(async () => {
    await owner.recovery.restrict()
  })
  navigation.pathname = "/clinics/clinic-b"
  view.rerender(tree("clinic-b", "person", undefined, "dashboard"))
  expect(owner.recovery.model.restricted).toBe(true)
  expect(owner.departureGuard.protectedWork[0]?.draft).toEqual({
    body: "Original private reply",
    attachment: "original-clinic-file",
  })
  act(() => owner.recovery.chooseClinic("clinic-b"))
  act(() => owner.recovery.declineDiscard())
  expect(discard).not.toHaveBeenCalled()
  expect(owner.recovery.model.restricted).toBe(true)
  act(() => owner.recovery.chooseClinic("clinic-b"))
  await act(async () => {
    await owner.recovery.confirmDiscard()
  })
  expect(discard).toHaveBeenCalledTimes(1)
  expect(navigation.push).toHaveBeenCalledWith("/clinics/clinic-b?section=messages")
  expect(owner.recovery.model.restricted).toBe(true)
  view.rerender(tree("clinic-b", "person", undefined, "messages"))
  expect(owner.recovery.model.restricted).toBe(false)
  view.unmount()
  await act(async () => {})
  expect(discard).toHaveBeenCalledTimes(1)
})
it("clears original protected work exactly once on actual principal departure and rejects stale leases", async () => {
  choices()
  const view = render(tree("clinic-a"))
  const discard = vi.fn()
  act(() =>
    owner.departureGuard.setReviewRequest((_proceed, _cancel, intent) =>
      intent === "access-loss" ? { draft: { body: "Private review draft" }, discard } : undefined,
    ),
  )
  await act(async () => {
    await owner.recovery.restrict()
  })
  const oldRegister = owner.register
  view.rerender(tree("clinic-a", "new-person"))
  await act(async () => {})
  expect(discard).toHaveBeenCalledTimes(1)
  expect(owner.departureGuard.protectedWork).toEqual([])
  act(() => owner.departureGuard.setReviewRequest(null))
  const stale = new AbortController()
  stale.abort()
  act(() =>
    oldRegister(
      {
        authenticatedContext: {
          ...context,
          principal: { ...context.principal, id: "person" },
          clinic: { ...context.clinic, id: "clinic-a" },
        },
      },
      stale.signal,
    ),
  )
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        schemaVersion: "clinic-scope-v1",
        status: "approved",
        principal: { id: "new-person", displayName: "New person", email: "new@example.invalid" },
        clinics: [{ id: "clinic-b", name: "Alternative", capabilities: [] }],
      }),
    ),
  )
  await act(async () => {
    await owner.recovery.restrict()
  })
  expect(owner.recovery.model.status).toBe("ready")
  expect(navigation.replace).not.toHaveBeenCalled()
  view.unmount()
  await act(async () => {})
  expect(discard).toHaveBeenCalledTimes(1)
})

it("runs original protected-work cleanup exactly once when the authenticated layout departs", async () => {
  choices()
  const view = render(tree("clinic-a"))
  const discard = vi.fn()
  act(() =>
    owner.departureGuard.setInquiryRequest((_proceed, _cancel, intent) =>
      intent === "access-loss" ? { draft: { body: "Private session work" }, discard } : undefined,
    ),
  )
  await act(async () => {
    await owner.recovery.restrict()
  })
  expect(owner.departureGuard.protectedWork).toHaveLength(1)
  view.unmount()
  await act(async () => {})
  expect(discard).toHaveBeenCalledTimes(1)
})

it("does not duplicate original cleanup when session departure overlaps confirmed discard", async () => {
  choices()
  const view = render(tree("clinic-a"))
  let finish!: () => void
  const discard = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  act(() =>
    owner.departureGuard.setInquiryRequest((_proceed, _cancel, intent) =>
      intent === "access-loss" ? { draft: { body: "Private pending cleanup" }, discard } : undefined,
    ),
  )
  await act(async () => {
    await owner.recovery.restrict()
  })
  act(() => owner.recovery.chooseClinic("clinic-b"))
  let pending!: Promise<void>
  act(() => {
    pending = owner.recovery.confirmDiscard()
  })
  await act(async () => {})
  view.unmount()
  await act(async () => {})
  expect(discard).toHaveBeenCalledTimes(1)
  await act(async () => {
    finish()
    await pending
  })
  expect(navigation.push).not.toHaveBeenCalled()
})
