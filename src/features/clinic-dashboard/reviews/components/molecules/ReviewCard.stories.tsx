import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import {
  openReviewFixture,
  publishedReviewFixture,
  submittedAppealReviewFixture,
  underReviewFixture,
} from "../../testing/reviews.fixtures"
import { ReviewCard } from "./ReviewCard"

const meta = {
  component: ReviewCard,
  tags: ["domain:reviews", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Molecules/Review Card",
} satisfies Meta<typeof ReviewCard>

export default meta
type Story = StoryObj<typeof meta>

const actionArgs = {
  onAppealOpen: fn(),
  onHistoryOpen: fn(),
  onNoteOpen: fn(),
  onResponseOpen: fn(),
}

export const Open: Story = {
  args: { ...actionArgs, review: openReviewFixture, showManagement: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Respond" }))
    await expect(args.onResponseOpen).toHaveBeenCalledWith(openReviewFixture.id)
  },
}

export const UnderReview: Story = {
  args: { ...actionArgs, review: underReviewFixture, showManagement: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Responses locked" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: "Appeal" })).not.toBeInTheDocument()
    await expect(canvas.queryByText("APPEAL-REVIEW-JANINE-DOE")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Incorrect clinic")).not.toBeInTheDocument()
  },
}

export const SubmittedAppeal: Story = {
  args: { ...actionArgs, review: submittedAppealReviewFixture, showManagement: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button", { name: "Appeal" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "History" })).toBeInTheDocument()
    await expect(canvas.queryByText("APPEAL-REVIEW-ANONYMOUS-COORDINATION")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Privacy concern")).not.toBeInTheDocument()
  },
}

export const PublishedResponseWithPendingEdit: Story = {
  args: { ...actionArgs, review: publishedReviewFixture, showManagement: true },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Published clinic response")).toBeInTheDocument()
    await expect(canvas.getByText("Pending moderation")).toBeInTheDocument()
    await expect(canvas.getByText(/^Saved 2023-10-16/)).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /retry|withdraw/i })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Edit pending response" }))
    await expect(args.onResponseOpen).toHaveBeenCalledWith(publishedReviewFixture.id)
  },
}

export const Presentation: Story = {
  args: { ...actionArgs, review: publishedReviewFixture, showManagement: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
    await expect(canvas.getByText("Published clinic response")).toBeInTheDocument()
    await expect(canvas.queryByText("Pending moderation")).not.toBeInTheDocument()
    await expect(
      canvas.queryByText("Thank you. We have shared your feedback with the consultation team."),
    ).not.toBeInTheDocument()
    await expect(canvas.queryByText("APPEAL-REVIEW-JANINE-DOE")).not.toBeInTheDocument()
  },
}

export const AppealCasePresentation: Story = {
  args: { ...actionArgs, review: underReviewFixture, showManagement: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
    await expect(canvas.queryByText("APPEAL-REVIEW-JANINE-DOE")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Incorrect clinic")).not.toBeInTheDocument()
    await expect(canvas.queryByText(/different clinic/i)).not.toBeInTheDocument()
  },
}
