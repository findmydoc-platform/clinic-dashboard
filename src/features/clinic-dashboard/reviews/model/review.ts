export const reviewStatuses = ["Answered", "Open", "Under review"] as const

export type ReviewStatus = (typeof reviewStatuses)[number]

export type ClinicReview = Readonly<{
  age: string
  author: string
  body: string
  createdAt: string
  id: string
  initials: string
  internalNotes: readonly string[]
  notice?: string
  rating: 1 | 2 | 3 | 4 | 5
  response?: string
  revision: number
  status: ReviewStatus
  treatment: string
}>
