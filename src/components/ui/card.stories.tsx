import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Card } from "./card"

const meta = {
  component: Card,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Card",
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "Card content",
    className: "p-6",
  },
}
