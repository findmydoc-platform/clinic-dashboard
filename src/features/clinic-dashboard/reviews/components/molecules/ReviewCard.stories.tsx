import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { openReviewFixture, underReviewFixture } from "../../testing/reviews.fixtures"
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
  },
}

export const Presentation: Story = {
  args: { ...actionArgs, review: openReviewFixture, showManagement: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button")).not.toBeInTheDocument()
  },
}
