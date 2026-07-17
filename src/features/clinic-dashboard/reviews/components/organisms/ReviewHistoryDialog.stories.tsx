import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { openReviewFixture, underReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewHistoryDialog } from "./ReviewHistoryDialog"

const meta = {
  component: ReviewHistoryDialog,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review History Dialog",
} satisfies Meta<typeof ReviewHistoryDialog>

export default meta
type Story = StoryObj<typeof meta>

export const RecordedHistory: Story = {
  args: {
    onClose: fn(),
    review: underReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })

    await expect(
      within(dialog).getByText("Appeal submitted by the clinic administrator."),
    ).toBeInTheDocument()
    await expect(within(dialog).queryByRole("button", { name: /save|submit/i })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getAllByRole("button", { name: "Close" }).at(-1)!)
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

export const EmptyHistory: Story = {
  args: {
    onClose: fn(),
    review: openReviewFixture,
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Review history",
    })

    await expect(within(dialog).getByText("No public response yet.")).toBeInTheDocument()
    await expect(within(dialog).getByText("No internal notes yet.")).toBeInTheDocument()
  },
}
