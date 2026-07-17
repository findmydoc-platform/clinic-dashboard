import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { openReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewAppealDialog } from "./ReviewAppealDialog"

const meta = {
  component: ReviewAppealDialog,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Appeal Dialog",
} satisfies Meta<typeof ReviewAppealDialog>

export default meta
type Story = StoryObj<typeof meta>

export const ModerationRequest: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn().mockResolvedValue(undefined),
    review: openReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Appeal review" })
    const submit = within(dialog).getByRole("button", { name: "Submit appeal" })

    await expect(submit).toBeDisabled()
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Reason" }),
      "Incorrect clinic",
    )
    await userEvent.type(
      within(dialog).getByLabelText("Appeal details"),
      "This review belongs to another clinic.",
    )
    await userEvent.click(submit)
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({
        detail: "This review belongs to another clinic.",
        reason: "Incorrect clinic",
      }),
    )
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

export const NarrowViewport: Story = {
  ...ModerationRequest,
  globals: { viewport: { value: "mobile320Short" } },
}
