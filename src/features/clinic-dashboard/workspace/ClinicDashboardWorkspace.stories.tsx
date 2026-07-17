import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspace, type ClinicDashboardWorkspaceProps } from "./ClinicDashboardWorkspace"

const productionArgs = {
  prototypeMode: "presentation",
} satisfies ClinicDashboardWorkspaceProps

const meta = {
  args: productionArgs,
  component: ClinicDashboardWorkspace,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:template", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Templates/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    await userEvent.click(
      within(canvas.getByRole("dialog", { name: "Clinic navigation" })).getByRole("button", {
        name: "Messages",
      }),
    )
    await expect(await canvas.findByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
  },
}
