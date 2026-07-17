import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Avatar } from "./avatar"

const meta = {
  component: Avatar,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Avatar",
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {
  args: { initials: "SS" },
}
