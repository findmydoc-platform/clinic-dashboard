import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { createReviewsState } from "../../model/reviews.reducer"
import { selectReviewsViewModel } from "../../model/reviews.selectors"
import type { ReviewsActions } from "../../model/reviews-view-model"
import { openReviewFixture, reviewsFixture } from "../../testing/reviews.fixtures"
import { ReviewsScreen } from "./ReviewsScreen"

const actions = {
  applyFilters: fn(),
  changeDraftFilters: fn(),
  changeMobileFiltersOpen: fn(),
  changePage: fn(),
  closeReviewDialog: fn(),
  exportReviews: fn(),
  markReviewAppealUnderReview: fn().mockResolvedValue("applied" as const),
  openReviewAppeal: fn(),
  openReviewHistory: fn(),
  openReviewNote: fn(),
  openReviewResponse: fn(),
  refreshReviews: fn(),
  submitReviewAppeal: fn().mockResolvedValue("applied" as const),
  submitReviewNote: fn().mockResolvedValue("applied" as const),
  submitReviewResponse: fn().mockResolvedValue("applied" as const),
} satisfies ReviewsActions

const meta = {
  component: ReviewsScreen,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Reviews Screen",
} satisfies Meta<typeof ReviewsScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Management: Story = {
  args: {
    actions,
    model: selectReviewsViewModel(createReviewsState(reviewsFixture.items), reviewsFixture, true),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByText("Manage patient feedback and respond to reviews.")).toBeInTheDocument()
    const openReview = canvasElement.querySelector('[data-review-status="Open"]')
    await expect(openReview).not.toBeNull()
    if (!openReview) return
    await userEvent.click(within(openReview as HTMLElement).getByRole("button", { name: "Appeal" }))
    await expect(args.actions.openReviewAppeal).toHaveBeenCalledWith(openReviewFixture.id)
  },
}

export const Presentation: Story = {
  args: {
    actions,
    model: selectReviewsViewModel(createReviewsState(reviewsFixture.items), reviewsFixture, false),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("View patient feedback and published review activity.")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Export" })).not.toBeInTheDocument()
    await expect(canvas.queryByLabelText("Review filters")).not.toBeInTheDocument()
  },
}
