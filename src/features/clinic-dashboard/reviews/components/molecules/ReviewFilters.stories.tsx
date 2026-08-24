import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { defaultReviewListFilters } from "../../model/review-source"
import { ReviewFilters } from "./ReviewFilters"

const meta = {
  component: ReviewFilters,
  tags: ["domain:reviews", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Reviews/Molecules/Review Filters",
} satisfies Meta<typeof ReviewFilters>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  args: {
    filters: defaultReviewListFilters,
    isDirty: false,
    isMobileOpen: true,
    onApply: fn(),
    onChange: fn(),
    onMobileOpenChange: fn(),
    treatmentOptions: [{ id: "dentistry", label: "Dentistry" }],
  },
}
