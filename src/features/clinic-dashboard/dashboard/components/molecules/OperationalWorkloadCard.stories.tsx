import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { OperationalWorkloadCard } from "./OperationalWorkloadCard"

const meta = {
  component: OperationalWorkloadCard,
  args: {
    title: "Open inquiries",
    state: { status: "ready", count: 104 },
    description: "Current open inquiry workload",
    emptyDescription: "No open inquiries",
    onOpen: fn(),
    onRetry: fn(),
  },
  tags: ["domain:dashboard", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Molecules/Operational Workload Card",
} satisfies Meta<typeof OperationalWorkloadCard>
export default meta
type Story = StoryObj<typeof meta>
export const Ready: Story = {}
export const Loading: Story = {
  args: { state: { status: "loading" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("status", { name: "Loading Open inquiries" }),
    ).toHaveAttribute("aria-busy", "true")
  },
}
export const Unavailable: Story = { args: { state: { status: "unavailable" } } }
export const Empty: Story = { args: { state: { status: "ready", count: 0 } } }
export const Dark: Story = { globals: { theme: "dark" } }
