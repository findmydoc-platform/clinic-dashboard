import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { RemovalUndoBanner } from "./RemovalUndoBanner"

const meta = {
  args: {
    isBusy: false,
    message: "Team member removed. Undo restores this item.",
    onUndo: fn(),
  },
  component: RemovalUndoBanner,
  tags: ["domain:clinic-profile", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Molecules/Removal Undo Banner",
} satisfies Meta<typeof RemovalUndoBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("status")).toHaveTextContent(args.message)
    await userEvent.click(canvas.getByRole("button", { name: "Undo removal" }))
    await expect(args.onUndo).toHaveBeenCalledOnce()
  },
}

export const Busy: Story = {
  args: { isBusy: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("button", { name: "Undo removal" })).toBeDisabled()
  },
}
