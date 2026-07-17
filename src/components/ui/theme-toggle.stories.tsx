import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ThemeToggle } from "./theme-toggle"

const meta = {
  component: ThemeToggle,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Theme Toggle",
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Icon: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /switch to .* theme/i })
    await userEvent.click(button)
    await expect(button).toHaveAccessibleName(/switch to .* theme/i)
  },
}

export const Labeled: Story = {
  args: { showLabel: true },
}

export const Switch: Story = {
  args: { variant: "switch" },
}
