import type { ClinicReview } from "./review"

export type ReviewDistributionEntry = Readonly<{
  count: number
  percent: number
  stars: number
}>

export type ReviewsData = Readonly<{
  distribution: readonly ReviewDistributionEntry[]
  items: readonly ClinicReview[]
  rating: number
  referenceTime: string
  total: number
}>
