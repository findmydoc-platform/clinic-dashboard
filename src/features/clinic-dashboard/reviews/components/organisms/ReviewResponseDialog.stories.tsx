import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { openReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewResponseDialog } from "./ReviewResponseDialog"

const meta = {
  component: ReviewResponseDialog,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Response Dialog",
} satisfies Meta<typeof ReviewResponseDialog>

export default meta
type Story = StoryObj<typeof meta>

export const NewResponse: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn().mockResolvedValue(undefined),
    review: openReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Respond to review",
    })
    const submit = within(dialog).getByRole("button", { name: "Save response" })

    await expect(submit).toBeDisabled()
    await userEvent.type(
      within(dialog).getByLabelText("Public response"),
      "Thank you for the helpful feedback.",
    )
    await userEvent.click(submit)
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({ response: "Thank you for the helpful feedback." }),
    )
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

export const ExistingResponse: Story = {
  args: {
    ...NewResponse.args,
    review: {
      ...openReviewFixture,
      response: "Thank you for sharing your experience with our team.",
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Respond to review",
    })

    await expect(within(dialog).getByLabelText("Public response")).toHaveValue(
      "Thank you for sharing your experience with our team.",
    )
    await expect(within(dialog).getByRole("button", { name: "Save response" })).toBeEnabled()
  },
}
