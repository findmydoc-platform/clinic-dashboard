import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { DashboardScreen } from "./DashboardScreen"

const meta = {
  component: DashboardScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Dashboard Screen",
} satisfies Meta<typeof DashboardScreen>

export default meta
type Story = StoryObj<typeof meta>

export const FullCapabilities: Story = {
  args: {
    actions: {
      onProfileTaskOpen: fn(),
      onProfileViewsDownload: fn(),
      onReviewsOpen: fn(),
    },
    canDownloadProfileViews: true,
    model: dashboardViewModel,
    showCertificateTasks: true,
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Review images" }))
    await expect(args.actions.onProfileTaskOpen).toHaveBeenCalledWith(dashboardViewModel.profileTasks[0])
    await userEvent.click(canvas.getByRole("button", { name: "Download profile views" }))
    await expect(args.actions.onProfileViewsDownload).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole("button", { name: "View reviews" }))
    await expect(args.actions.onReviewsOpen).toHaveBeenCalledOnce()
  },
}

export const PresentationCapabilities: Story = {
  args: {
    actions: {
      onProfileTaskOpen: fn(),
      onProfileViewsDownload: fn(),
      onReviewsOpen: fn(),
    },
    canDownloadProfileViews: false,
    model: dashboardViewModel,
    showCertificateTasks: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Review images" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /^View details/ })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Open preview" })).not.toBeInTheDocument()
  },
}

export const NarrowViewport: Story = {
  ...PresentationCapabilities,
  globals: { viewport: { value: "mobile320Short" } },
}
