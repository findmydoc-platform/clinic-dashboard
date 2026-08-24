import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { defaultReviewListFilters } from "../../model/review-source"
import { reviewSourceSnapshotFixture } from "../../testing/review-source.fixtures"
import { ReviewsScreen } from "./ReviewsScreen"

const actions = {
  applyFilters: fn(),
  changeDraftFilters: fn(),
  changeMobileFiltersOpen: fn(),
  changePage: fn(),
  closeReviewDialog: fn(),
  loadOlderHistory: fn(),
  openReviewAppeal: fn(),
  openReviewHistory: fn(),
  openReviewResponse: fn(),
  refreshReviews: fn(),
  submitReviewAppeal: fn(async () => "applied" as const),
  submitReviewResponse: fn(async () => "applied" as const),
}
const model = {
  dialog: { kind: "closed" as const },
  filters: {
    draft: defaultReviewListFilters,
    isDirty: false,
    isMobileOpen: false,
    treatmentOptions: reviewSourceSnapshotFixture.treatments,
  },
  isLoading: false,
  list: reviewSourceSnapshotFixture.page,
  showManagement: true,
  statusMessage: "",
  summary: reviewSourceSnapshotFixture.summary,
}
const meta = {
  component: ReviewsScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Reviews Screen",
} satisfies Meta<typeof ReviewsScreen>
export default meta
type Story = StoryObj<typeof meta>
export const CompleteWorkflowMatrix: Story = { args: { actions, model } }
export const MobileDark: Story = {
  args: { actions, model },
  globals: { theme: "dark", viewport: { value: "mobile390Tall" } },
}
export const Loading: Story = {
  args: { actions, model: { ...model, isLoading: true, statusMessage: "Loading reviews…" } },
}
export const Unavailable: Story = {
  args: {
    actions,
    model: {
      ...model,
      list: undefined,
      statusMessage: "Reviews are temporarily unavailable.",
      summary: undefined,
    },
  },
}
export const Empty: Story = {
  args: { actions, model: { ...model, list: { ...reviewSourceSnapshotFixture.page, items: [], total: 0 } } },
}
