import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { authenticatedClinicContextFixture } from "./testing/workspace.fixtures"
import { clinicDashboardWorkspaceFixture } from "./testing/public"
import { ClinicDashboardWorkspace } from "./ClinicDashboardWorkspace"

const meta = {
  args: {
    authenticatedContext: authenticatedClinicContextFixture,
    prototypeMode: "presentation",
    workspaceInput: clinicDashboardWorkspaceFixture,
  },
  component: ClinicDashboardWorkspace,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VisualReference: Story = {
  args: { prototypeMode: "visual-reference" },
}
