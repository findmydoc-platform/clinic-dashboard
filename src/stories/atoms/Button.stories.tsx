import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"

const meta = {
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs", "layer:atom", "domain:shared"],
  title: "Shared/Atoms/Button",
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: "Save changes",
  },
}

export const Secondary: Story = {
  args: {
    children: "View details",
    variant: "secondary",
  },
}
