import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { EmptyState } from "@/components/molecules/EmptyState"

const meta = {
  component: EmptyState,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs", "layer:molecule", "domain:shared"],
  title: "Shared/Molecules/EmptyState",
} satisfies Meta<typeof EmptyState>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    description: "Clinic data, workflows, and sign-in are intentionally outside this foundation release.",
    title: "No clinic modules connected",
  },
}
