import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ClinicAccessRecoveryScreen } from "./ClinicAccessRecoveryScreen"

const clinic = { id: "synthetic-alternative", name: "Alternative Clinic", capabilities: [] }
const meta = {
  title: "Clinic Dashboard/Workspace/Organisms/Clinic Access Recovery Screen",
  component: ClinicAccessRecoveryScreen,
  tags: ["domain:workspace", "layer:organism", "status:prototype"],
  parameters: { layout: "fullscreen" },
  args: {
    model: { choices: [clinic], hasProtectedWork: false, restricted: true, status: "ready" },
    onChoose: fn(),
    onRefresh: fn(),
    onDeclineDiscard: fn(),
    onConfirmDiscard: fn(),
  },
} satisfies Meta<typeof ClinicAccessRecoveryScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Choices: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Clinic access has changed" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Open Alternative Clinic" }))
    await expect(args.onChoose).toHaveBeenCalledWith(clinic.id)
  },
}
export const Loading: Story = {
  args: { model: { choices: [], hasProtectedWork: false, restricted: true, status: "loading" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "Checking your current clinic choices",
    )
  },
}
export const Unavailable: Story = {
  args: { model: { choices: [], hasProtectedWork: true, restricted: true, status: "unavailable" } },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Refresh clinic choices" }))
    await expect(args.onRefresh).toHaveBeenCalledOnce()
  },
}
export const NoAlternatives: Story = {
  args: { model: { choices: [], hasProtectedWork: true, restricted: true, status: "ready" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/No other clinics are currently available/)).toBeVisible()
    await expect(canvas.queryByRole("button", { name: /^Open / })).not.toBeInTheDocument()
  },
}
export const DiscardConfirmation: Story = {
  args: {
    model: {
      choices: [clinic],
      pendingClinic: clinic,
      hasProtectedWork: true,
      restricted: true,
      status: "ready",
    },
  },
  play: async ({ canvasElement, args }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole("alertdialog", {
      name: "Discard unfinished clinic work?",
    })
    await expect(dialog).toBeVisible()
    await userEvent.click(within(dialog).getByRole("button", { name: "Stay restricted" }))
    await expect(args.onDeclineDiscard).toHaveBeenCalledOnce()
  },
}
export const At320: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
export const Dark: Story = { globals: { theme: "dark" }, args: DiscardConfirmation.args }
