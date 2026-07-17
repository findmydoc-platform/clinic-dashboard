import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RatingSummary } from "./RatingSummary"

const meta = {
  component: RatingSummary,
  tags: ["domain:reviews", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Molecules/Rating Summary",
} satisfies Meta<typeof RatingSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { count: 1248, value: 4.8 },
}
