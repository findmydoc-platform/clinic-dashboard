import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { openReviewFixture } from "../../testing/reviews.fixtures"
import { ReviewTextMutationDialog } from "./ReviewTextMutationDialog"

const meta = {
  component: ReviewTextMutationDialog,
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Text Mutation Dialog",
} satisfies Meta<typeof ReviewTextMutationDialog>

export default meta
type Story = StoryObj<typeof meta>

export const ValidatedText: Story = {
  args: {
    description: "Add an internal review note.",
    label: "Internal note",
    onClose: fn(),
    onSubmit: fn().mockResolvedValue(undefined),
    placeholder: "Add context for the clinic team…",
    review: openReviewFixture,
    submitLabel: "Save note",
    title: "Add internal note",
  },
  play: async ({ args, canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Add internal note",
    })
    const submit = within(dialog).getByRole("button", { name: "Save note" })

    await expect(submit).toBeDisabled()
    await userEvent.type(within(dialog).getByLabelText("Internal note"), "Reception follow-up recorded.")
    await userEvent.click(submit)
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledWith("Reception follow-up recorded."))
  },
}
