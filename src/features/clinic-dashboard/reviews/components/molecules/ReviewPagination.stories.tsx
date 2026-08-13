import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { ReviewPagination } from "./ReviewPagination"
const meta = {
  component: ReviewPagination,
  tags: ["domain:reviews", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Reviews/Molecules/Review Pagination",
} satisfies Meta<typeof ReviewPagination>
export default meta
type Story = StoryObj<typeof meta>
export const MiddlePage: Story = {
  args: { onPageChange: fn(), page: 2, pageCount: 5, pageSize: 10, total: 43 },
}
