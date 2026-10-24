import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { SupportRequestDialog } from "./SupportRequestDialog"
import type { SupportCommand } from "../../model/support-request"
const accepted: SupportCommand = async () => ({ status: "accepted" })
const meta = {
  args: { onOpenChange: fn(), open: true, send: accepted },
  component: SupportRequestDialog,
  tags: ["domain:support", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Support/Organisms/Support Request Dialog",
} satisfies Meta<typeof SupportRequestDialog>
export default meta
type Story = StoryObj<typeof meta>
async function fill(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  await userEvent.type(canvas.getByRole("textbox", { name: "Subject" }), "Profile update failed")
  await userEvent.type(
    canvas.getByRole("textbox", { name: "Message" }),
    "The clinic profile fails to save the changes.",
  )
  await userEvent.click(canvas.getByRole("button", { name: "Send support request" }))
}
export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.queryByRole("combobox")).not.toBeInTheDocument()
    await expect(c.queryByLabelText("Optional screenshot")).not.toBeInTheDocument()
    await expect(c.getByText(/Do not include patient data/)).toBeVisible()
  },
}
export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(c.getByRole("button", { name: "Send support request" }))
    await expect(c.getByRole("textbox", { name: "Subject" })).toHaveFocus()
    await expect(c.getByText("Enter a subject with 5–160 characters on one line.")).toBeVisible()
  },
}
export const Accepted: Story = {
  play: async ({ canvasElement }) => {
    await fill(canvasElement)
    const c = within(canvasElement)
    await expect(await c.findByRole("status", { name: "Request accepted" })).toBeVisible()
    await expect(c.getByText(/This does not confirm inbox delivery/)).toBeVisible()
    await waitFor(() => expect(c.getByRole("button", { name: "Done" })).toHaveFocus())
  },
}
export const Pending: Story = {
  args: { send: async () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await fill(canvasElement)
    const c = within(canvasElement)
    await expect(c.getByRole("button", { name: "Sending…" })).toBeDisabled()
    await expect(c.getByRole("textbox", { name: "Message" })).toBeDisabled()
  },
}
export const ConfirmedFailure: Story = {
  args: { send: async () => ({ status: "failed" }) },
  play: async ({ canvasElement }) => {
    await fill(canvasElement)
    const c = within(canvasElement)
    await expect(await c.findByRole("alert")).toHaveTextContent("could not be sent")
    await expect(c.getByRole("textbox", { name: "Subject" })).toHaveValue("Profile update failed")
    await expect(c.getByRole("textbox", { name: "Message" })).toHaveValue(
      "The clinic profile fails to save the changes.",
    )
  },
}
export const UnknownOutcome: Story = {
  ...ConfirmedFailure,
  args: { send: async () => ({ status: "unknown" }) },
  play: async ({ canvasElement }) => {
    await fill(canvasElement)
    const c = within(canvasElement)
    await expect(await c.findByRole("alert")).toHaveTextContent("may create a duplicate request")
    await expect(c.getByRole("textbox", { name: "Message" })).toHaveValue(
      "The clinic profile fails to save the changes.",
    )
  },
}
export const Mobile320ShortForm: Story = {
  ...Empty,
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement).getByRole("dialog")
    const bounds = dialog.getBoundingClientRect()
    await expect(bounds.left).toBeGreaterThanOrEqual(15)
    await expect(bounds.right).toBeLessThanOrEqual(window.innerWidth - 15)
    await expect(bounds.bottom).toBeLessThanOrEqual(window.innerHeight - 15)
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
  },
}
export const DarkForm: Story = { ...Empty, globals: { theme: "dark" } }
export const DarkUnknownOutcome: Story = { ...UnknownOutcome, globals: { theme: "dark" } }
function FocusHarness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open support</Button>
      <SupportRequestDialog onOpenChange={setOpen} open={open} send={accepted} />
    </>
  )
}
export const KeyboardAndFocusReturn: Story = {
  render: () => <FocusHarness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const trigger = c.getByRole("button", { name: "Open support" })
    await userEvent.click(trigger)
    const subject = c.getByRole("textbox", { name: "Subject" })
    subject.focus()
    await userEvent.tab()
    await expect(c.getByRole("textbox", { name: "Message" })).toHaveFocus()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}
