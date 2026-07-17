import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ReviewFilters } from "./ReviewFilters"

const meta = {
  component: ReviewFilters,
  render: (args) => <ControlledReviewFilters key={JSON.stringify(args.filters)} {...args} />,
  tags: ["domain:reviews", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Molecules/Review Filters",
} satisfies Meta<typeof ReviewFilters>

export default meta
type Story = StoryObj<typeof meta>

function ControlledReviewFilters(props: ComponentProps<typeof ReviewFilters>) {
  const [filters, setFilters] = useState(props.filters)

  return (
    <ReviewFilters
      {...props}
      filters={filters}
      isDirty={filters.status !== props.filters.status}
      onChange={(nextFilters) => {
        setFilters(nextFilters)
        props.onChange(nextFilters)
      }}
    />
  )
}

export const Desktop: Story = {
  args: {
    filters: { period: "all", rating: "all", status: "all", treatment: "all" },
    isDirty: false,
    isMobileOpen: false,
    isRefreshing: false,
    onApply: fn(),
    onChange: fn(),
    onMobileOpenChange: fn(),
    onRefresh: fn(),
    treatmentOptions: ["Dentistry", "Hair transplant"],
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(canvas.getByLabelText("Status"), "Open")
    await expect(canvas.getByText("Changes not applied")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Apply filters" }))
    await expect(args.onApply).toHaveBeenCalledOnce()
  },
}

export const MobileClosed: Story = {
  args: { ...Desktop.args, isMobileOpen: false },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Show filters" })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await expect(args.onMobileOpenChange).toHaveBeenCalledWith(true)
  },
}
