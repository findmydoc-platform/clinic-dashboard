import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { userEvent, within } from "storybook/test"
import { toast } from "sonner"
import { Button } from "./button"
import { Toaster } from "./sonner"

function SonnerStory() {
  return (
    <>
      <Button onClick={() => toast.success("Profile published.")}>Show success</Button>
      <Toaster />
    </>
  )
}

const meta = {
  component: Toaster,
  parameters: { layout: "centered" },
  render: () => <SonnerStory />,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Toaster",
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Show success" }))
  },
}
