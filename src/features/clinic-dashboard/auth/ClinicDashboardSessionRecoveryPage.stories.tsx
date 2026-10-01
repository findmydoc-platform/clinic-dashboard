import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { ClinicDashboardSessionRecoveryPage } from "./ClinicDashboardSessionRecoveryPage"

const meta = {
  component: ClinicDashboardSessionRecoveryPage,
  args: { csrfToken: "storybook-only", mode: "refresh", returnTarget: "/", submitAction: fn() },
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:stable"],
  title: "Clinic Dashboard/Workspace/Pages/Session Recovery",
} satisfies Meta<typeof ClinicDashboardSessionRecoveryPage>
export default meta
type Story = StoryObj<typeof meta>

export const Recovering: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("check your session")
    await expect(args.submitAction).toHaveBeenCalledOnce()
  },
}
export const Dark: Story = { globals: { theme: "dark" } }
export const Mobile: Story = { globals: { viewport: { value: "mobile320Short" } } }
