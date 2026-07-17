import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ClinicDashboardWorkspace } from "./ClinicDashboardWorkspace"

const meta = {
  args: { prototypeMode: "presentation" },
  component: ClinicDashboardWorkspace,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:template", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Templates/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  args: { initialSection: "messages", prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
}
