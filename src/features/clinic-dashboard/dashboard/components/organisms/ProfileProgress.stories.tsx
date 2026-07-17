import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ProfileProgress } from "./ProfileProgress"

const meta = {
  component: ProfileProgress,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Profile Progress",
} satisfies Meta<typeof ProfileProgress>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  completion: dashboardViewModel.profileCompletion,
  onTaskOpen: fn(),
  showCertificateTasks: true,
  tasks: dashboardViewModel.profileTasks,
} satisfies Story["args"]

export const FullInterfaceActions: Story = {
  args: defaultArgs,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 2, name: "Profile progress" })).toBeInTheDocument()
    await expect(canvas.getByText("82%")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Review images" }))
    await expect(args.onTaskOpen).toHaveBeenCalledWith(dashboardViewModel.profileTasks[0])
    await userEvent.click(canvas.getByRole("button", { name: "View details for Certificates required" }))
    await expect(args.onTaskOpen).toHaveBeenCalledWith(dashboardViewModel.profileTasks[2])
  },
}

export const PresentationActions: Story = {
  args: { ...defaultArgs, showCertificateTasks: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Review images" })).toBeInTheDocument()
    await expect(
      canvas.queryByRole("button", { name: "View details for Certificates required" }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("group", { name: "Certificates required profile task" }),
    ).toBeInTheDocument()
  },
}
