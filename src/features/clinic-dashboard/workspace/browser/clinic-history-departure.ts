let activeTraversal: { lease: symbol; handle: (event: PopStateEvent) => void } | undefined
let initialized = false

// The early transport has no editor state or decisions. Only the current
// mounted lifetime may supply its callback, and stale leases cannot remove it.
export function initializeClinicHistoryDeparture() {
  if (initialized) return
  initialized = true
  window.addEventListener("popstate", (event) => activeTraversal?.handle(event), true)
}

type NavigationPosition = EventTarget &
  Readonly<{
    currentEntry: Readonly<{ index: number }> | null
  }>

type HistoryDecision = (continueTraversal: () => void, cancelTraversal: () => void) => void

// This adapter owns browser positions only. The mounted lifetime still owns
// editor decisions, original commands and protected work.
export function installClinicHistoryDeparture({
  requestDeparture,
  isRestricted,
  onNavigationAway,
}: Readonly<{
  requestDeparture: HistoryDecision
  isRestricted: () => boolean
  onNavigationAway: () => void
}>): () => void {
  const navigation = (window as Window & { navigation?: NavigationPosition }).navigation
  const markerKey = "__clinicWorkspacePosition"
  const marker = (state: unknown): { owner: string; index: number } | undefined => {
    if (!state || typeof state !== "object") return
    const value = (state as Record<string, unknown>)[markerKey]
    if (!value || typeof value !== "object") return
    const candidate = value as Record<string, unknown>
    if (typeof candidate.owner !== "string" || !Number.isSafeInteger(candidate.index)) return
    return candidate as { owner: string; index: number }
  }
  const existing = marker(window.history.state)
  const owner = existing?.owner ?? crypto.randomUUID()
  const useNativeIndex = !!navigation?.currentEntry
  let current = useNativeIndex ? navigation!.currentEntry!.index : (existing?.index ?? 0)
  const readPosition = (state: unknown) => {
    if (useNativeIndex) return navigation?.currentEntry?.index
    const value = marker(state)
    return value?.owner === owner ? value.index : undefined
  }
  const previousPush = window.history.pushState
  const previousReplace = window.history.replaceState
  const tagged = (data: unknown, index: number) => ({
    ...(data && typeof data === "object" ? data : {}),
    [markerKey]: { owner, index },
  })
  let disposed = false
  type Traversal = { source: number; target: number; phase: "restoring" | "deciding" | "replaying" }
  let pending: Traversal | undefined
  let restorationFrame: number | undefined
  const cancelRestoration = () => {
    if (restorationFrame !== undefined) cancelAnimationFrame(restorationFrame)
    restorationFrame = undefined
  }
  // Coalesce already queued native traversals before choosing a relative delta.
  // A second Back/Forward can otherwise move the starting entry of history.go.
  const restoreSource = () => {
    if (restorationFrame !== undefined) return
    restorationFrame = requestAnimationFrame(() => {
      restorationFrame = undefined
      if (disposed || !pending) return
      const observed = readPosition(window.history.state)
      if (observed !== undefined && observed !== pending.source) window.history.go(pending.source - observed)
    })
  }

  const advance = () => {
    cancelRestoration()
    pending = undefined
    current = readPosition(window.history.state) ?? current
  }
  const push: History["pushState"] = function (data, unused, url) {
    if (disposed) return previousPush.call(window.history, data, unused, url)
    previousPush.call(window.history, tagged(data, current + 1), unused, url)
    advance()
  }
  const replace: History["replaceState"] = function (data, unused, url) {
    if (disposed) return previousReplace.call(window.history, data, unused, url)
    previousReplace.call(
      window.history,
      tagged(data, readPosition(window.history.state) ?? current),
      unused,
      url,
    )
    if (!pending) advance()
  }
  // Preserve the complete opaque Next state, adding only an unrelated position.
  previousReplace.call(window.history, tagged(window.history.state, current), "")
  window.history.pushState = push
  window.history.replaceState = replace

  const onEntryChange = (event: Event) => {
    const type = (event as Event & { navigationType?: string }).navigationType
    if (type === "traverse") return
    advance()
  }
  const onPopState = (event: PopStateEvent) => {
    const target = readPosition(event.state)
    if (target === undefined || target < 0) return
    if (pending?.phase === "replaying" && pending.target === target) {
      pending = undefined
      current = target
      onNavigationAway()
      return
    }
    if (pending?.phase === "restoring") {
      event.stopImmediatePropagation()
      if (target !== pending.source) {
        pending.target = target
        restoreSource()
        return
      }
      cancelRestoration()
      const traversal = pending
      traversal.phase = "deciding"
      requestDeparture(
        () => {
          if (disposed || pending !== traversal) return
          traversal.phase = "replaying"
          window.history.go(traversal.target - traversal.source)
        },
        () => {
          if (pending === traversal) pending = undefined
        },
      )
      return
    }
    if (target === current || isRestricted()) {
      pending = undefined
      current = target
      return
    }
    event.stopImmediatePropagation()
    pending = { source: current, target, phase: "restoring" }
    restoreSource()
  }
  // Next 16 restores its opaque history state in a bubbling popstate listener.
  // Restore the original native entry before asking the existing editor owner;
  // only the accepted replay is delivered to Next. No history entry is replaced.
  initializeClinicHistoryDeparture()
  const lease = Symbol("clinic-history-owner")
  activeTraversal = { lease, handle: onPopState }
  navigation?.addEventListener("currententrychange", onEntryChange)
  return () => {
    disposed = true
    cancelRestoration()
    pending = undefined
    if (activeTraversal?.lease === lease) activeTraversal = undefined
    navigation?.removeEventListener("currententrychange", onEntryChange)
    if (window.history.pushState === push) window.history.pushState = previousPush
    if (window.history.replaceState === replace) window.history.replaceState = previousReplace
  }
}
