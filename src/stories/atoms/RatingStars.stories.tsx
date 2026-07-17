import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { RatingStars } from "@/components/atoms/DashboardPrimitives"

const meta = {
  component: RatingStars,
  decorators: [
    (Story) => (
      <div className="rounded-xl bg-[var(--background)] p-8 text-[var(--foreground)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { test: "error" },
    layout: "centered",
  },
  tags: ["autodocs", "layer:atom", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Atoms/Rating Stars",
} satisfies Meta<typeof RatingStars>

export default meta
type Story = StoryObj<typeof meta>

export const FractionalRating: Story = {
  args: { value: 4.8 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rating = canvas.getByRole("img", { name: "4.8 out of 5 stars" })

    await expect(rating.querySelectorAll('[data-star-state="full"]')).toHaveLength(4)
    await expect(rating.querySelectorAll('[data-star-state="partial"]')).toHaveLength(1)
    await expect(rating.querySelector('[data-star-fill="80"]')).toBeInTheDocument()
  },
}

export const HalfRating: Story = {
  args: { value: 3.5 },
}

export const EmptyRating: Story = {
  args: { value: 0 },
}
