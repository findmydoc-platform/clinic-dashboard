// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { installClinicHistoryDeparture } from "@/features/clinic-dashboard/workspace/browser/clinic-history-departure"

const nativeReplace = window.history.replaceState
const nativePush = window.history.pushState
const cleanups: (() => void)[] = []
let frame: FrameRequestCallback | undefined
const stateAt = (index: number) => ({
  __NA: true,
  opaqueNext: { retained: true },
  __clinicWorkspacePosition: { owner: "test-positions", index },
})
function pop(index: number) {
  const state = stateAt(index)
  nativeReplace.call(window.history, state, "")
  window.dispatchEvent(new PopStateEvent("popstate", { state }))
}
function install(requestDeparture = vi.fn()) {
  const cleanup = installClinicHistoryDeparture({
    requestDeparture,
    isRestricted: () => false,
    onNavigationAway: vi.fn(),
  })
  cleanups.push(cleanup)
  return cleanup
}
beforeEach(() => {
  nativeReplace.call(window.history, stateAt(0), "")
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frame = callback
      return 1
    }),
  )
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn(() => {
      frame = undefined
    }),
  )
})
afterEach(() => {
  cleanups.reverse().forEach((cleanup) => cleanup())
  cleanups.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  frame = undefined
})
it("preserves opaque Next state and native push/replace stack semantics, then restores its wrappers", () => {
  const cleanup = install()
  const length = history.length
  history.pushState({ __NA: true, opaqueNext: { retained: "push" } }, "")
  expect(history.length).toBe(length + 1)
  expect(history.state).toMatchObject({
    __NA: true,
    opaqueNext: { retained: "push" },
    __clinicWorkspacePosition: { index: 1 },
  })
  history.replaceState({ __NA: true, opaqueNext: { retained: "replace" } }, "")
  expect(history.length).toBe(length + 1)
  expect(history.state).toMatchObject({
    opaqueNext: { retained: "replace" },
    __clinicWorkspacePosition: { index: 1 },
  })
  cleanup()
  expect(history.pushState).toBe(nativePush)
  expect(history.replaceState).toBe(nativeReplace)
})
it("invalidates a pending continuation after a newer push and after lifetime teardown", () => {
  const request = vi.fn()
  const go = vi.spyOn(history, "go").mockImplementation(() => undefined)
  const cleanup = install(request)
  history.pushState(stateAt(1), "")
  pop(0)
  frame?.(0)
  pop(1)
  const continuation = request.mock.calls[0]![0] as () => void
  history.pushState(stateAt(2), "")
  continuation()
  expect(go).toHaveBeenCalledTimes(1)
  pop(1)
  frame?.(0)
  pop(2)
  const disposedContinuation = request.mock.calls[1]![0] as () => void
  cleanup()
  disposedContinuation()
  expect(go).toHaveBeenCalledTimes(2)
})
it("stale cleanup cannot remove a newer mounted lifetime callback", () => {
  const first = vi.fn()
  const second = vi.fn()
  vi.spyOn(history, "go").mockImplementation(() => undefined)
  const staleCleanup = install(first)
  history.pushState(stateAt(1), "")
  install(second)
  staleCleanup()
  pop(0)
  frame?.(0)
  pop(1)
  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledOnce()
})
