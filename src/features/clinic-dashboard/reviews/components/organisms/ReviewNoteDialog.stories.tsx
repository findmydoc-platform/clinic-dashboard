import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { openReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewNoteDialog } from "./ReviewNoteDialog"

const meta = {
  component: ReviewNoteDialog,
  render: (args) => (
    <ReviewNoteDialog
      {...args}
      onSubmit={async (submission) => {
        await args.onSubmit(submission)
        return "applied"
      }}
    />
  ),
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Note Dialog",
} satisfies Meta<typeof ReviewNoteDialog>

export default meta
type Story = StoryObj<typeof meta>

export const InternalNote: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(),
    review: openReviewFixture,
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Add internal note",
    })
    const submit = within(dialog).getByRole("button", { name: "Save note" })

    await expect(submit).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText("Internal note"), "Reception follow-up recorded.")
    await userEvent.click(submit)
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith({ note: "Reception follow-up recorded." }))
    await waitFor(() => expect(args.onClose).toHaveBeenCalledOnce())
  },
}
