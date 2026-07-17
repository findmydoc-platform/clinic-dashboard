"use client"

import { useLayoutEffect, type ReactNode } from "react"

export type StorybookThemeName = "dark" | "light"

type StorybookThemeProps = Readonly<{
  children: ReactNode
  theme: StorybookThemeName
}>

export function StorybookTheme({ children, theme }: StorybookThemeProps) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previousColorScheme = root.style.colorScheme
    const wasDark = root.classList.contains("dark")

    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme

    return () => {
      root.classList.toggle("dark", wasDark)
      root.style.colorScheme = previousColorScheme
    }
  }, [theme])

  return children
}
