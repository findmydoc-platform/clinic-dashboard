import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DashboardSummaryCard } from "./DashboardSummaryCard"

const meta = {
  component: DashboardSummaryCard,
  args: {
    title: "Public profile completion",
    state: { status: "ready", value: "100%", progress: 100, detail: "6 of 6 profile areas complete" },
    action: { kind: "static" },
  },
  tags: ["domain:dashboard", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Molecules/Dashboard Summary Card",
} satisfies Meta<typeof DashboardSummaryCard>
export default meta
type Story = StoryObj<typeof meta>
export const Completion: Story = {}
export const Loading: Story = {
  args: {
    title: "Open inquiries",
    state: { status: "loading" },
    action: { kind: "open", label: "View inquiries", onOpen: fn() },
  },
}
export const Empty: Story = {
  args: {
    title: "Open inquiries",
    state: { status: "ready", value: "0", detail: "No open inquiries" },
    action: { kind: "open", label: "View inquiries", onOpen: fn() },
  },
}
export const PendingModeration: Story = {
  args: {
    title: "Reviews to answer",
    state: {
      status: "ready",
      value: "0",
      detail: "No reviews awaiting your response",
      secondaryText: "2 responses pending moderation",
    },
    action: { kind: "open", label: "View reviews", onOpen: fn() },
  },
}
export const Unavailable: Story = {
  args: {
    title: "Open inquiries",
    state: { status: "unavailable", value: "Unavailable", onRetry: fn() },
    action: { kind: "open", label: "View inquiries", onOpen: fn() },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Retry Open inquiries" }))
    if (args.state.status === "unavailable") await expect(args.state.onRetry).toHaveBeenCalledTimes(1)
    if (args.action.kind === "open") {
      await expect(args.action.onOpen).not.toHaveBeenCalled()
      const bounds = canvasElement.querySelector("section")!.getBoundingClientRect()
      const edge = canvasElement.ownerDocument.elementFromPoint(bounds.right - 3, bounds.bottom - 3)
      await expect(edge).not.toBeNull()
      await userEvent.click(edge as Element)
      await expect(args.action.onOpen).toHaveBeenCalledTimes(1)
      await userEvent.keyboard("{Enter}")
      await expect(args.action.onOpen).toHaveBeenCalledTimes(2)
      await userEvent.keyboard(" ")
      await expect(args.action.onOpen).toHaveBeenCalledTimes(3)
    }
  },
}
export const Dark: Story = { globals: { theme: "dark" } }
const open = fn()
export const ReusableRow: Story = {
  render: () => (
    <div className="grid grid-cols-4 gap-4">
      <DashboardSummaryCard
        title="Public profile completion"
        state={{ status: "ready", value: "100%", progress: 100, detail: "6 of 6 profile areas complete" }}
        action={{ kind: "static" }}
      />
      <DashboardSummaryCard
        title="Open inquiries"
        state={{ status: "ready", value: "9", detail: "Current open inquiry workload" }}
        action={{ kind: "open", label: "View inquiries", onOpen: open }}
      />
      <DashboardSummaryCard
        title="Reviews to answer"
        state={{
          status: "ready",
          value: "14",
          detail: "Public reviews without a submitted clinic response. Opens Published reviews.",
          secondaryText: "2 responses pending moderation",
        }}
        action={{ kind: "open", label: "View reviews", onOpen: fn() }}
      />
      <DashboardSummaryCard
        title="A deliberately longer future dashboard card title"
        state={{ status: "ready", value: "3", detail: "Example content" }}
        action={{ kind: "open", label: "View details", onOpen: fn() }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const regions = Array.from(canvasElement.querySelectorAll("section"))
    const bounds = regions.map((element) => element.getBoundingClientRect())
    await expect(bounds).toHaveLength(4)
    for (const box of bounds.slice(1)) await expect(Math.abs(box.height - bounds[0].height)).toBeLessThan(1)
    const values = ["100%", "9", "14", "3"].map(
      (value) => canvas.getByText(value).getBoundingClientRect().top,
    )
    for (const value of values.slice(1)) await expect(Math.abs(value - values[0])).toBeLessThan(1)
    const box = bounds[1]
    const target = canvasElement.ownerDocument.elementFromPoint(box.right - 3, box.bottom - 3)
    await expect(target).not.toBeNull()
    await userEvent.click(target as Element)
    await expect(open).toHaveBeenCalled()
  },
}
