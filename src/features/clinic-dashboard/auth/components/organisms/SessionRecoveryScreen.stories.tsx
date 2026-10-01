import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SessionRecoveryScreen } from "./SessionRecoveryScreen"

const meta = {
  component: SessionRecoveryScreen,
  args: { csrfToken: "storybook-only", mode: "refresh", returnTarget: "/" },
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Workspace/Organisms/Session Recovery",
} satisfies Meta<typeof SessionRecoveryScreen>
export default meta
type Story = StoryObj<typeof meta>
export const Pending: Story = {}
