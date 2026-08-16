"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

export function Toaster(props: ToasterProps) {
  const { resolvedTheme, theme } = useTheme()
  const documentTheme =
    typeof document === "undefined"
      ? undefined
      : document.documentElement.classList.contains("dark")
        ? "dark"
        : "light"
  const toasterTheme =
    theme === "system" ? (resolvedTheme ?? documentTheme ?? "system") : (theme ?? documentTheme)

  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--border-radius": "var(--radius-lg)",
          "--normal-bg": "var(--background)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--foreground)",
        } as React.CSSProperties
      }
      theme={toasterTheme as ToasterProps["theme"]}
      {...props}
    />
  )
}
