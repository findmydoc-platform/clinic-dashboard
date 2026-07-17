import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ReviewPagination } from "./ReviewPagination"

const meta = {
  component: ReviewPagination,
  tags: ["domain:reviews", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Molecules/Review Pagination",
} satisfies Meta<typeof ReviewPagination>

export default meta
type Story = StoryObj<typeof meta>

export const FirstPage: Story = {
  args: {
    filteredCount: 6,
    onPageChange: fn(),
    page: 1,
    pageCount: 2,
    rangeEnd: 3,
    rangeStart: 1,
    totalPublicReviews: 1248,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Previous review page" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Next review page" }))
    await expect(args.onPageChange).toHaveBeenCalledWith(2)
  },
}
