import { z } from "zod"

export const reviewWorkloadSchema = z
  .object({
    reviewsToAnswerCount: z.number().int().nonnegative(),
    pendingModerationCount: z.number().int().nonnegative(),
  })
  .strict()

export type ReviewWorkload = z.infer<typeof reviewWorkloadSchema>
export type ReviewWorkloadState =
  | Readonly<{ status: "loading" | "unavailable" }>
  | Readonly<{ status: "ready"; workload: ReviewWorkload; refreshState: "idle" | "updating" | "stale" }>
