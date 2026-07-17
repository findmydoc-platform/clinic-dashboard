export const accountMenuActions = {
  profile: { label: "Account profile", visibility: "always" },
  theme: { label: "Dark mode", visibility: "always" },
  signOut: { label: "Sign out", visibility: "always" },
} as const

type WorkspaceAccountIdentity = Readonly<{
  initials: string
  name: string
  role: string
}>

export type StaffProfile = Readonly<{
  initials: string
  name: string
  role: string
}>

export function createStaffProfile({ initials, name, role }: WorkspaceAccountIdentity): StaffProfile {
  return { initials, name, role }
}
