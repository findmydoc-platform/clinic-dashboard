import type { ReactNode } from "react"
import { ClinicWorkspaceLifetimeProvider } from "@/features/clinic-dashboard/public"

export default function ClinicsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ClinicWorkspaceLifetimeProvider>{children}</ClinicWorkspaceLifetimeProvider>
}
