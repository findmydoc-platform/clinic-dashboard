import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import {
  openReviewFixture,
  publishedReviewFixture,
  submittedAppealReviewFixture,
  underReviewFixture,
} from "../../testing/reviews.fixtures"
import { ReviewHistoryDialog } from "./ReviewHistoryDialog"

const meta = {
  component: ReviewHistoryDialog,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review History Dialog",
} satisfies Meta<typeof ReviewHistoryDialog>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyAppealCase: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("discarded" as const),
    review: openReviewFixture,
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })

    await expect(within(dialog).getByText("No appeal case has been opened.")).toBeInTheDocument()
    await expect(within(dialog).queryByRole("button", { name: "Mark as under review" })).toBeNull()
  },
}

export const SubmittedAppealCase: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("applied" as const),
    review: submittedAppealReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })
    const timeline = within(dialog).getByRole("list")

    await expect(within(dialog).getByText("APPEAL-REVIEW-ANONYMOUS-COORDINATION")).toBeInTheDocument()
    await expect(within(dialog).getByText("Privacy concern")).toBeInTheDocument()
    await expect(within(timeline).getAllByRole("listitem")).toHaveLength(1)
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark as under review" }))
    await waitFor(() => expect(args.onMarkAppealUnderReview).toHaveBeenCalledOnce())
  },
}

export const SubmittedAppealMobile320: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("applied" as const),
    review: submittedAppealReviewFixture,
  },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })
    const reference = within(dialog).getByText("APPEAL-REVIEW-ANONYMOUS-COORDINATION")
    const eventId = within(dialog).getByText("APPEAL-REVIEW-ANONYMOUS-COORDINATION-EVENT-1")

    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
    await expect(reference).toBeVisible()
    await expect(reference.scrollWidth).toBeLessThanOrEqual(reference.clientWidth)
    await expect(eventId.scrollWidth).toBeLessThanOrEqual(eventId.clientWidth)
    await expect(within(dialog).getByRole("button", { name: "Mark as under review" })).toBeVisible()
  },
}

export const UnderReviewAppealCase: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("discarded" as const),
    review: underReviewFixture,
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })
    const timelineItems = within(within(dialog).getByRole("list")).getAllByRole("listitem")

    await expect(timelineItems).toHaveLength(2)
    await expect(within(timelineItems[0]!).getByText("Appeal case submitted")).toBeInTheDocument()
    await expect(within(timelineItems[1]!).getByText("Status changed to under review")).toBeInTheDocument()
    await expect(within(dialog).queryByRole("button", { name: "Mark as under review" })).toBeNull()
    await expect(
      within(dialog).queryByRole("button", { name: /approve|reject|final decision|retry|withdraw/i }),
    ).toBeNull()
  },
}

export const PendingModerationHistory: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("discarded" as const),
    review: publishedReviewFixture,
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })

    await expect(within(dialog).getByText("Published clinic response")).toBeInTheDocument()
    await expect(within(dialog).getByText("Pending moderation")).toBeInTheDocument()
    await expect(within(dialog).getByText(/^Saved 2023-10-16/)).toBeInTheDocument()
    await expect(
      within(dialog).getByText("Thank you. We have shared your feedback with the consultation team."),
    ).toBeInTheDocument()
  },
}

export const FocusedClose: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("discarded" as const),
    review: openReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })

    await userEvent.click(within(dialog).getAllByRole("button", { name: "Close" }).at(-1)!)
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

export const UnderReviewDark: Story = {
  args: {
    onClose: fn(),
    onMarkAppealUnderReview: fn().mockResolvedValue("discarded" as const),
    review: underReviewFixture,
  },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })

    await expect(within(dialog).getByText("APPEAL-REVIEW-JANINE-DOE")).toBeVisible()
    await expect(within(dialog).getByText("Status changed to under review")).toBeVisible()
  },
}
