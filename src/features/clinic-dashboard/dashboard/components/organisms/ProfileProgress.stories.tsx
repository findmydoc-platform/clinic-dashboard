import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import {
  dashboardProfileProgressComplete,
  dashboardProfileProgressConflict,
  dashboardProfileProgressDraft,
  dashboardProfileProgressEmpty,
  dashboardProfileProgressError,
  dashboardProfileProgressLoading,
  dashboardProfileProgressPublishReady,
  dashboardProfileProgressReady,
} from "../../testing/dashboard.fixtures"
import { ProfileProgress } from "./ProfileProgress"

const meta = {
  component: ProfileProgress,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Profile Progress",
} satisfies Meta<typeof ProfileProgress>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  onRetry: fn(),
  onTaskOpen: fn(),
  progress: dashboardProfileProgressReady,
} satisfies Story["args"]

export const IncompletePublicProfile: Story = {
  args: defaultArgs,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("heading", { level: 2, name: "Public profile progress" }),
    ).toBeInTheDocument()
    await expect(canvas.getByRole("progressbar", { name: "Public profile progress: 67%" })).toHaveAttribute(
      "aria-valuenow",
      "67",
    )
    await expect(canvas.getByText("4 of 6 profile areas complete")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "View details for Add clinic images" }))
    await expect(args.onTaskOpen).toHaveBeenCalledWith(dashboardProfileProgressReady.tasks[0])
  },
}

export const AllSixAreasNeedAttention: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressEmpty },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("0 of 6 profile areas complete")).toBeVisible()
    await expect(canvas.getAllByRole("listitem")).toHaveLength(6)
    await expect(canvas.queryByText(/priority/i)).not.toBeInTheDocument()
    await expect(canvas.queryByText(/qualified inquiries/i)).not.toBeInTheDocument()
  },
}

export const CompletePublicProfile: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressComplete },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Your public profile is complete")).toBeVisible()
    await expect(canvas.getByText("6 of 6 profile areas complete")).toBeVisible()
    await expect(canvas.queryByRole("list", { name: "Profile tasks" })).not.toBeInTheDocument()
  },
}

export const CompleteProfileDraft: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressDraft },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Your public profile is complete")).toBeVisible()
    await expect(canvas.getByText("Complete profile draft")).toBeVisible()
    await expect(
      canvas.getByText("2 areas are ready in your draft. 2 areas still need attention."),
    ).toBeVisible()
  },
}

export const PublishProfileChanges: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressPublishReady },
}

export const ReviewProfileChangesDark: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressConflict },
  globals: { theme: "dark" },
}

export const Loading: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressLoading },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "Loading public profile progress",
    )
  },
}

export const ErrorWithRetry: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressError },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Public profile progress is temporarily unavailable.",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
  },
}

export const NarrowViewport: Story = {
  args: { ...defaultArgs, progress: dashboardProfileProgressEmpty },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const button of canvas.getAllByRole("button", { name: /^View details for/ })) {
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    }
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
