import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { reviewSourceRecordsFixture } from "../../testing/review-source.fixtures"
import { ReviewDetailPanel } from "./ReviewDetailPanel"

const meta = {
  component: ReviewDetailPanel,
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Detail Panel",
  args: {
    actions: { openReviewAppeal: fn(), openReviewHistory: fn(), openReviewResponse: fn() },
    showManagement: true,
    onClose: fn(),
  },
} satisfies Meta<typeof ReviewDetailPanel>
export default meta
type Story = StoryObj<typeof meta>
export const Current: Story = { args: { detail: { status: "ready", review: reviewSourceRecordsFixture[0] } } }
export const Removed: Story = { args: { detail: { status: "ready", review: reviewSourceRecordsFixture[2] } } }
export const Loading: Story = { args: { detail: { status: "loading" } } }
export const Unavailable: Story = { args: { detail: { status: "unavailable" } } }
