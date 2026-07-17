import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { BrandMark } from "./BrandMark"

const meta = {
  args: { priority: true },
  component: BrandMark,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Brand Mark",
} satisfies Meta<typeof BrandMark>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img", { name: "findmydoc" })).toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img", { name: "findmydoc" })).toBeInTheDocument()
  },
}
