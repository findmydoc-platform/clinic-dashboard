import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { reviewHistoryFixture, reviewSourceRecordsFixture } from "../../testing/review-source.fixtures"
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
