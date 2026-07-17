import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { openReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewMutationDialog } from "./ReviewMutationDialog"

const meta = {
  component: ReviewMutationDialog,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Mutation Dialog",
} satisfies Meta<typeof ReviewMutationDialog>

export default meta
type Story = StoryObj<typeof meta>

export const SubmissionLifecycle: Story = {
  args: {
    children: <p>Focused mutation fields render here.</p>,
    description: "Update this review.",
    isSubmitDisabled: false,
    onClose: fn(),
    onSubmit: fn().mockResolvedValue(undefined),
    review: openReviewFixture,
    submitLabel: "Save change",
    title: "Update review",
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Update review" })

    await userEvent.click(within(dialog).getByRole("button", { name: "Save change" }))
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce())
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}
