"use client"

export function clearCompletedSessionRecovery() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has("sessionRecovery")) return
  url.searchParams.delete("sessionRecovery")
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
}
