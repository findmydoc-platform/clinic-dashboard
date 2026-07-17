import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { openReviewFixture, publishedReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewResponseDialog } from "./ReviewResponseDialog"

const meta = {
  component: ReviewResponseDialog,
  render: (args) => (
    <ReviewResponseDialog
      {...args}
      onSubmit={async (submission) => {
        await args.onSubmit(submission)
        return "applied"
      }}
    />
  ),
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Response Dialog",
} satisfies Meta<typeof ReviewResponseDialog>

export default meta
type Story = StoryObj<typeof meta>

export const NewResponse: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(),
    review: openReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Respond to review",
    })
    const submit = within(dialog).getByRole("button", { name: "Submit for moderation" })

    await expect(submit).toBeDisabled()
    await userEvent.type(
      within(dialog).getByLabelText("Response for moderation"),
      "Thank you for the helpful feedback.",
    )
    await userEvent.click(submit)
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith({ response: "Thank you for the helpful feedback." }),
    )
    await waitFor(() => expect(args.onClose).toHaveBeenCalledOnce())
  },
}

export const ExistingPublishedResponse: Story = {
  args: {
    ...NewResponse.args,
    review: { ...publishedReviewFixture, pendingResponse: undefined },
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Respond to review",
    })

    await expect(within(dialog).getByLabelText("Response for moderation")).toHaveValue(
      publishedReviewFixture.publishedResponse,
    )
    await expect(
      within(dialog).getByText(/published response stays unchanged until the pending response is approved/i),
    ).toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Submit for moderation" })).toBeEnabled()
  },
}

export const ExistingPendingResponse: Story = {
  args: {
    ...NewResponse.args,
    review: publishedReviewFixture,
  },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Respond to review",
    })

    await expect(within(dialog).getByLabelText("Response for moderation")).toHaveValue(
      "Thank you. We have shared your feedback with the consultation team.",
    )
  },
}
