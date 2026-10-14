import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
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
export const Removed: Story = {
  args: { detail: { status: "ready", review: reviewSourceRecordsFixture[2] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.queryByText("Approved review")).not.toBeInTheDocument()
    expect(canvas.getByText("Review text removed")).toBeVisible()
    expect(canvas.getByRole("button", { name: "Respond" })).toBeVisible()
    expect(canvas.getByRole("button", { name: "View history" })).toBeVisible()
  },
}
export const Withdrawn: Story = {
  args: {
    detail: {
      status: "ready",
      review: {
        ...reviewSourceRecordsFixture[2],
        publicMeasure: "none",
        withdrawalState: "withdrawn",
        appeal: undefined,
        withdrawnAt: "2026-01-25T12:00:00.000Z",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.queryByText("Approved review")).not.toBeInTheDocument()
    expect(canvas.getByText("Review withdrawn")).toBeVisible()
    expect(canvas.getByRole("button", { name: "Respond" })).toBeVisible()
    expect(canvas.getByRole("button", { name: "Submit appeal" })).toBeVisible()
    expect(canvas.getByRole("button", { name: "View history" })).toBeVisible()
  },
}
export const Loading: Story = { args: { detail: { status: "loading" } } }
export const Unavailable: Story = { args: { detail: { status: "unavailable" } } }
