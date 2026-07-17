import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { SupportRequestDialog } from "./SupportRequestDialog"

const meta = {
  args: {
    onOpenChange: fn(),
    open: true,
  },
  component: SupportRequestDialog,
  tags: ["domain:support", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Support/Organisms/Support Request Dialog",
} satisfies Meta<typeof SupportRequestDialog>

export default meta
type Story = StoryObj<typeof meta>

async function submitValidRequest(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Category" }), "Technical issue")
  await userEvent.type(canvas.getByRole("textbox", { name: "Subject" }), "Profile update failed")
  await userEvent.type(
    canvas.getByRole("textbox", { name: "Message" }),
    "The clinic profile does not update after I save the changes.",
  )
  await userEvent.click(canvas.getByRole("button", { name: "Submit prototype request" }))
}

function FocusReturnHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open support prototype</Button>
      <SupportRequestDialog onOpenChange={setOpen} open={open} />
    </div>
  )
}

export const Empty: Story = {}

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Submit prototype request" }))
    await expect(canvas.getByText("Choose a support category.")).toBeInTheDocument()
    await expect(canvas.getByRole("combobox", { name: "Category" })).toHaveFocus()
  },
}

export const HonestLocalResult: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText("Email")).toBeInTheDocument()
    await expect(canvas.queryByRole("combobox", { name: /reply/i })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument()
    await expect(
      canvas.queryByText(/phone|whatsapp|direct support|business day|ticket/i),
    ).not.toBeInTheDocument()

    await submitValidRequest(canvasElement)

    const result = await canvas.findByRole("status")
    await expect(result).toHaveTextContent(/^Prototype only — no request was sent\.$/)
    await expect(canvas.queryByRole("heading", { name: "Support request" })).not.toBeInTheDocument()
    await expect(canvas.queryByText(/ticket|response|reply/i)).not.toBeInTheDocument()
  },
}

export const ScreenshotKeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const message = canvas.getByRole("textbox", { name: "Message" })
    const screenshot = canvas.getByLabelText("Optional screenshot")
    const focusSurface = canvas.getByText("PNG or JPG, up to 5 MB").parentElement
    if (!focusSurface) throw new Error("Screenshot focus surface is missing.")

    message.focus()
    await userEvent.tab()

    await expect(screenshot).toHaveFocus()
    await expect(focusSurface).toHaveStyle({ outlineStyle: "solid", outlineWidth: "2px" })
  },
}

export const CancelReturnsFocus: Story = {
  render: () => <FocusReturnHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Open support prototype" })

    await userEvent.click(trigger)
    const dialog = canvas.getByRole("dialog", { name: "Contact support" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const DarkHonestResult: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await submitValidRequest(canvasElement)
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "Prototype only — no request was sent.",
    )
  },
}
