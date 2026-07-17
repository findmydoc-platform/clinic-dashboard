import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ReviewSummary } from "./ReviewSummary"

const meta = {
  component: ReviewSummary,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Review Summary",
} satisfies Meta<typeof ReviewSummary>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  onOpen: fn(),
  rating: dashboardViewModel.rating,
  reviewActivity: dashboardViewModel.reporting.reviewActivity,
} satisfies Story["args"]

export const ManagementEntry: Story = {
  args: defaultArgs,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 2, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByText("(1,248 total reviews)")).toBeInTheDocument()
    await expect(canvas.getByText("1 response pending")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "View reviews" }))
    await expect(args.onOpen).toHaveBeenCalledOnce()
  },
}

export const DarkTheme: Story = {
  ...ManagementEntry,
  globals: { theme: "dark" },
}
