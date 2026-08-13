import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import {
  editedPendingResponseHistoryFixture,
  reviewHistoryFixture,
  reviewSourceRecordsFixture,
} from "../../testing/review-source.fixtures"
import { ReviewHistoryDialog } from "./ReviewHistoryDialog"
const meta = {
  component: ReviewHistoryDialog,
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Review History Dialog",
} satisfies Meta<typeof ReviewHistoryDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Loaded: Story = {
  args: {
    dialog: {
      history: reviewHistoryFixture,
      isLoading: false,
      isLoadingOlder: false,
      kind: "history",
      review: reviewSourceRecordsFixture[0],
    },
    onClose: fn(),
    onLoadOlder: fn(),
  },
}
export const EditedPendingResponse: Story = {
  args: {
    dialog: {
      history: editedPendingResponseHistoryFixture,
      isLoading: false,
      isLoadingOlder: false,
      kind: "history",
      review: reviewSourceRecordsFixture[1],
    },
    onClose: fn(),
    onLoadOlder: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    await expect(canvas.getByText("Response submitted")).toBeVisible()
    await expect(canvas.getByText("Pending moderation")).toBeVisible()
    await expect(canvas.getByText(/Edited$/)).toBeVisible()
    await expect(
      canvas.getByText("Thank you for the detailed feedback. We have shared it with the aftercare team."),
    ).toBeVisible()
    await expect(
      canvas.queryByText("Thank you for the detailed feedback. We are reviewing it with our team."),
    ).not.toBeInTheDocument()
    await expect(canvas.getByText("Appeal submitted")).toBeVisible()
  },
}
export const Loading: Story = {
  args: {
    dialog: {
      isLoading: true,
      isLoadingOlder: false,
      kind: "history",
      review: reviewSourceRecordsFixture[0],
    },
    onClose: fn(),
    onLoadOlder: fn(),
  },
}
export const Error: Story = {
  args: {
    dialog: {
      error: "Review history could not be loaded. Try again.",
      isLoading: false,
      isLoadingOlder: false,
      kind: "history",
      review: reviewSourceRecordsFixture[0],
    },
    onClose: fn(),
    onLoadOlder: fn(),
  },
}
