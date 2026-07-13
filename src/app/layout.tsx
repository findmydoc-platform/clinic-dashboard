import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/organisms/AppShell/ThemeProvider"
import "./globals.css"

export const metadata: Metadata = {
  description: "Foundation for the independent findmydoc clinic workspace.",
  robots: {
    follow: false,
    index: false,
  },
  title: "Clinic Dashboard foundation | findmydoc",
}

type RootLayoutProps = Readonly<{
  children: ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
