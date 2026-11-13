import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { OperationalWorkloadCard } from "./OperationalWorkloadCard"

const meta = {
  component: OperationalWorkloadCard,
  args: {
    title: "Open inquiries",
    state: { status: "ready", refreshState: "idle", count: 104 },
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
export const Ready: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const action = canvas.getByRole("button", { name: "Open inquiries" })
    await expect(within(action).getByText("View inquiries")).toBeVisible()
    await userEvent.click(action)
    await expect(args.onOpen).toHaveBeenCalled()
  },
}
export const Loading: Story = {
  args: { state: { status: "loading" } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("status", { name: "Loading Open inquiries" }),
    ).toHaveAttribute("aria-busy", "true")
  },
}
export const Unavailable: Story = { args: { state: { status: "unavailable" } } }
export const Empty: Story = { args: { state: { status: "ready", refreshState: "idle", count: 0 } } }
export const Dark: Story = { globals: { theme: "dark" } }

export const Updating: Story = {
  args: { state: { status: "ready", count: 104, refreshState: "updating" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText("104")).toBeVisible()
    expect(canvas.queryByRole("status")).not.toBeInTheDocument()
  },
}
export const Stale: Story = {
  args: {
    title: "Reviews to answer",
    description: "Public reviews without a submitted response",
    emptyDescription: "No reviews awaiting your response",
    state: { status: "ready", count: 4, refreshState: "stale" },
    secondaryText: "2 responses pending moderation",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const main = canvas.getByRole("button", { name: "Reviews to answer" })
    expect(within(main).getByText("4")).toBeVisible()
    expect(within(main).getByText("2 responses pending moderation")).toBeVisible()
    expect(main).toHaveAccessibleDescription(/4.*Update failed. Showing previous values./)
    const retry = canvas.getByRole("button", { name: "Retry Reviews to answer" })
    expect(retry).toHaveAccessibleDescription("Update failed. Showing previous values.")
    retry.focus()
    await userEvent.keyboard("{Enter}")
    expect(args.onRetry).toHaveBeenCalled()
    expect(args.onOpen).not.toHaveBeenCalled()
    expect(main).toHaveFocus()
  },
}
export const StaleDark: Story = { ...Stale, globals: { theme: "dark" } }
