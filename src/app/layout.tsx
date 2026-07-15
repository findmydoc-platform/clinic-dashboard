import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/organisms/AppShell/ThemeProvider"
import "./globals.css"

export const metadata: Metadata = {
  description: "Independent findmydoc workspace for clinic teams.",
  robots: {
    follow: false,
    index: false,
    noarchive: true,
    noimageindex: true,
    googleBot: {
      follow: false,
      index: false,
      noarchive: true,
      noimageindex: true,
    },
  },
  title: "Clinic Dashboard | findmydoc",
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
