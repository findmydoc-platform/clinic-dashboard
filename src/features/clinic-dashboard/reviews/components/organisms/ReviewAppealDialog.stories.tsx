import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { reviewSourceRecordsFixture } from "../../testing/review-source.fixtures"
import { ReviewAppealDialog } from "./ReviewAppealDialog"
const meta = {
  component: ReviewAppealDialog,
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Appeal Dialog",
} satisfies Meta<typeof ReviewAppealDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    review: reviewSourceRecordsFixture[0],
  },
}
