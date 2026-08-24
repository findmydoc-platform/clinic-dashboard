import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import type { ClinicReviewRecord } from "../../model/review-source"
import { reviewSourceRecordsFixture } from "../../testing/review-source.fixtures"
import { ReviewCard } from "./ReviewCard"

const meta = {
  component: ReviewCard,
  tags: ["domain:reviews", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Reviews/Molecules/Review Card",
} satisfies Meta<typeof ReviewCard>
export default meta
type Story = StoryObj<typeof meta>

const actions = { onAppealOpen: fn(), onHistoryOpen: fn(), onResponseOpen: fn(), showManagement: true }
const base = reviewSourceRecordsFixture[0]
const storyReview = (changes: Partial<ClinicReviewRecord>): ClinicReviewRecord => ({
  ...base,
  ...changes,
  id: `story-${String(changes.id ?? "review")}`,
})
export const PublishedResponse: Story = { args: { ...actions, review: reviewSourceRecordsFixture[0] } }
export const ContextWithPendingRevision: Story = {
  args: { ...actions, review: reviewSourceRecordsFixture[1] },
}
export const RemovedWithUpheldAppeal: Story = { args: { ...actions, review: reviewSourceRecordsFixture[2] } }
export const Redacted: Story = {
  args: {
    ...actions,
    review: storyReview({
      id: "redacted",
      publicMeasure: "redaction",
      publicNotice: "Parts of this review were removed to protect personal data.",
      publicText: "Great result with minor waiting time.",
    }),
  },
}
export const Placeholder: Story = {
  args: {
    ...actions,
    review: storyReview({
      id: "placeholder",
      publicMeasure: "placeholder",
      publicNotice: "This review was moderated. Its written content is not publicly available.",
      publicText: undefined,
    }),
  },
}
export const Withdrawn: Story = {
  args: {
    ...actions,
    review: storyReview({
      id: "withdrawn",
      publicText: undefined,
      withdrawalState: "withdrawn",
      withdrawnAt: "2026-01-25T12:00:00.000Z",
    }),
  },
}
export const RejectedReplacement: Story = {
  args: {
    ...actions,
    review: storyReview({
      id: "rejected-response",
      response: {
        id: "response-rejected",
        moderatedAt: "2026-01-22T08:30:00.000Z",
        published: base.response?.published,
        status: "rejected",
      },
    }),
  },
}
export const BlockedResponse: Story = {
  args: {
    ...actions,
    review: storyReview({
      id: "blocked-response",
      response: {
        id: "response-blocked",
        moderatedAt: "2026-01-26T12:00:00.000Z",
        status: "blocked",
      },
    }),
  },
}
export const AppealSubmitted: Story = {
  args: {
    ...actions,
    review: storyReview({
      appeal: {
        createdAt: "2026-01-16T09:00:00.000Z",
        details: "The clinic believes this review refers to a different location.",
        id: "appeal-submitted",
        reason: "incorrect_clinic",
        status: "submitted",
      },
      id: "appeal-submitted",
    }),
  },
}
export const AppealUnderReview: Story = {
  args: {
    ...actions,
    review: storyReview({
      appeal: {
        createdAt: "2026-01-18T08:00:00.000Z",
        details: "The clinic asks the platform team to assess the written content.",
        id: "appeal-under-review",
        reason: "inappropriate_content",
        status: "under_review",
      },
      id: "appeal-under-review",
    }),
  },
}
export const AppealDismissed: Story = {
  args: {
    ...actions,
    review: storyReview({
      appeal: {
        createdAt: "2026-01-22T09:00:00.000Z",
        decidedAt: "2026-01-24T11:30:00.000Z",
        decisionReason: "The treatment context was verified and the review remains public.",
        details: "The clinic asks the platform team to verify the documented treatment context.",
        id: "appeal-dismissed",
        reason: "other",
        status: "dismissed",
      },
      id: "appeal-dismissed",
    }),
  },
}
