import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { InlineTextDiff } from "./inline-text-diff"

const meta = {
  args: {
    after: "Modern technologies and an experienced medical team.",
    before: "Modern technology and an experinced medical team.",
  },
  component: InlineTextDiff,
  parameters: { layout: "centered" },
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Inline Text Diff",
} satisfies Meta<typeof InlineTextDiff>

export default meta
type Story = StoryObj<typeof meta>

export const CharacterLevelChanges: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("y", { selector: "del" })).toBeVisible()
    await expect(canvas.getByText("ies", { selector: "ins" })).toBeVisible()
  },
}
