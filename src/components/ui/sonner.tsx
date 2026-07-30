"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme()

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
      theme={theme as ToasterProps["theme"]}
      {...props}
    />
  )
}
