import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"

const meta = {
  component: Button,
  tags: ["domain:shared", "layer:atom", "status:stable"],
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

export const Accent: Story = {
  args: {
    children: "Selected",
    variant: "accent",
  },
}
