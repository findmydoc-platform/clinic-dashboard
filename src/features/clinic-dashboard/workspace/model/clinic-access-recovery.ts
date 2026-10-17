import type { AuthorizedClinic } from "@/features/clinic-dashboard/auth/public"

export type ClinicAccessRecoveryModel = Readonly<{
  scope?: string
  status: "active" | "loading" | "ready" | "unavailable" | "changing"
  choices: readonly AuthorizedClinic[]
  pendingClinic?: AuthorizedClinic
  error?: string
  restricted: boolean
  hasProtectedWork: boolean
}>
