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

export type SignedInStaffProfile = Readonly<{
  initials: string
  name: string
  role: string
}>

export function createSignedInStaffProfile({
  initials,
  name,
  role,
}: WorkspaceAccountIdentity): SignedInStaffProfile {
  return { initials, name, role }
}
