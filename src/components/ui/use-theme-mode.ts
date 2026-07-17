"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

function getDocumentTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function subscribeToDocumentTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, { attributeFilter: ["class"], attributes: true })
  return () => observer.disconnect()
}

function subscribeToClientState() {
  return () => undefined
}

export function useThemeMode() {
  const { forcedTheme, resolvedTheme, setTheme, themes } = useTheme()
  const isClient = useSyncExternalStore(
    subscribeToClientState,
    () => true,
    () => false,
  )
  const documentTheme = useSyncExternalStore(subscribeToDocumentTheme, getDocumentTheme, () => "light")
  const isDark = isClient && (forcedTheme ?? resolvedTheme ?? documentTheme) === "dark"

  const setDarkMode = (nextDark: boolean) => {
    const nextTheme = nextDark ? "dark" : "light"

    if (themes.length > 0) {
      setTheme(nextTheme)
      return
    }

    document.documentElement.classList.toggle("dark", nextDark)
    document.documentElement.style.colorScheme = nextTheme
  }

  return { isDark, setDarkMode } as const
}
