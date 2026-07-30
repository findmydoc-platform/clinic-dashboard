export const accountMenuActions = {
  profile: { label: "Account profile", visibility: "always" },
  theme: { label: "Dark mode", visibility: "always" },
  signOut: { label: "Sign out", visibility: "always" },
} as const

type WorkspaceAccountIdentity = Readonly<{
  email?: string
  initials: string
  name: string
  role: string
}>

export type StaffProfile = Readonly<{
  email?: string
  initials: string
  name: string
  role: string
}>

export function createStaffProfile({ email, initials, name, role }: WorkspaceAccountIdentity): StaffProfile {
  return { email, initials, name, role }
}
