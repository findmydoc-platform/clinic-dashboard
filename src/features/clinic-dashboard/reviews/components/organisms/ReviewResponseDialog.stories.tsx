import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { reviewSourceRecordsFixture } from "../../testing/review-source.fixtures"
import { ReviewResponseDialog } from "./ReviewResponseDialog"
const meta = {
  component: ReviewResponseDialog,
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Response Dialog",
} satisfies Meta<typeof ReviewResponseDialog>
export default meta
type Story = StoryObj<typeof meta>
export const NewResponse: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    review: reviewSourceRecordsFixture[2],
  },
}
export const PendingRevision: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    review: reviewSourceRecordsFixture[1],
  },
}
