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

const prohibitedSupportClaims = /phone|whatsapp|address|service hours|direct support|ticket|sla|business day/i

async function submitValidRequest(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Category" }), "Technical issue")
  await userEvent.type(canvas.getByRole("textbox", { name: "Subject" }), "Profile update failed")
  await userEvent.type(
    canvas.getByRole("textbox", { name: "Message" }),
    "The clinic profile does not update after I save the changes.",
  )
  await userEvent.click(canvas.getByRole("button", { name: "Submit demo request" }))
}

async function expectDialogWithinViewport(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const dialog = canvas.getByRole("dialog", { name: "Contact support" })
  const content = within(dialog).getByLabelText("Contact support content")
  const viewport = canvasElement.ownerDocument.defaultView
  const viewportHeight = viewport?.innerHeight ?? 700
  const viewportWidth = viewport?.innerWidth ?? 320
  const bounds = dialog.getBoundingClientRect()

  await expect(bounds.top).toBeGreaterThanOrEqual(15)
  await expect(bounds.right).toBeLessThanOrEqual(viewportWidth - 15)
  await expect(bounds.bottom).toBeLessThanOrEqual(viewportHeight - 15)
  await expect(bounds.left).toBeGreaterThanOrEqual(15)
  await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
  await expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth)
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
    await userEvent.click(canvas.getByRole("button", { name: "Submit demo request" }))
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
    await expect(canvas.queryByText(prohibitedSupportClaims)).not.toBeInTheDocument()

    await submitValidRequest(canvasElement)

    await expect(canvas.getByRole("button", { name: "Completing demo…" })).toBeDisabled()

    const result = await canvas.findByRole("status", {
      name: "Demo complete — no support request was sent or saved.",
    })
    await expect(within(result).getByRole("heading", { name: "Demo complete" })).toBeVisible()
    await expect(within(result).getByText("No support request was sent or saved.")).toBeVisible()
    await waitFor(() => expect(canvas.getByRole("button", { name: "Done" })).toHaveFocus())
    await expect(canvas.queryByRole("heading", { name: "Support request" })).not.toBeInTheDocument()
    await expect(canvas.queryByText(prohibitedSupportClaims)).not.toBeInTheDocument()
    await expect(canvas.queryByText(/response|reply/i)).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Create another request" }))
    await expect(canvas.getByRole("heading", { name: "Support request" })).toBeInTheDocument()
    await expect(canvas.getByRole("textbox", { name: "Subject" })).toHaveValue("")
    await waitFor(() => expect(canvas.getByRole("combobox", { name: "Category" })).toHaveFocus())
  },
}

export const Mobile320ShortForm: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { name: "Support request" })).toBeInTheDocument()
    await expectDialogWithinViewport(canvasElement)
  },
}

export const Mobile320ShortValidationError: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Submit demo request" }))
    await expect(canvas.getByText("Choose a support category.")).toBeInTheDocument()
    await expect(canvas.getByRole("combobox", { name: "Category" })).toHaveFocus()
    await expectDialogWithinViewport(canvasElement)
  },
}

export const Mobile320ShortResult: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await submitValidRequest(canvasElement)
    await expect(
      await canvas.findByRole("status", {
        name: "Demo complete — no support request was sent or saved.",
      }),
    ).toBeVisible()
    await waitFor(() => expect(canvas.getByRole("button", { name: "Done" })).toHaveFocus())
    await expectDialogWithinViewport(canvasElement)
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
    await expect(
      await within(canvasElement).findByRole("status", {
        name: "Demo complete — no support request was sent or saved.",
      }),
    ).toBeVisible()
  },
}
