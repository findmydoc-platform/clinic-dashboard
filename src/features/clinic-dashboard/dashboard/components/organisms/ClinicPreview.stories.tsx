import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ClinicPreview } from "./ClinicPreview"

const meta = {
  component: ClinicPreview,
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Clinic Preview",
} satisfies Meta<typeof ClinicPreview>

export default meta
type Story = StoryObj<typeof meta>

const defaultArgs = {
  clinic: dashboardViewModel.clinicPreview,
} satisfies Story["args"]

export const Available: Story = {
  args: defaultArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("img", { name: "Exterior of Berlin Health Clinic" })).toBeInTheDocument()
    await expect(canvas.getByText("Berlin Health")).toBeInTheDocument()
    await expect(canvas.getByText("Mitte, Berlin")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Open preview" })).not.toBeInTheDocument()
    await expect(canvas.getByText("Public clinic preview")).toBeInTheDocument()
  },
}

export const NarrowViewport: Story = {
  ...Available,
  globals: { viewport: { value: "mobile320Short" } },
}
