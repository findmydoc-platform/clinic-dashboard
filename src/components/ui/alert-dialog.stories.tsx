import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { AlertDialog } from "./alert-dialog"
import { Button } from "./button"

function ControlledAlertDialog(props: ComponentProps<typeof AlertDialog>) {
  const [open, setOpen] = useState(props.open)

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)} variant="destructive">
        Discard draft
      </Button>
      <AlertDialog
        {...props}
        actions={
          <>
            <Button onClick={() => setOpen(false)} variant="outline">
              Keep draft
            </Button>
            <Button onClick={() => setOpen(false)} variant="destructive">
              Discard draft
            </Button>
          </>
        }
        onOpenChange={setOpen}
        open={open}
      />
    </div>
  )
}

const meta = {
  args: {
    actions: null,
    description: "The published profile will not change.",
    onOpenChange: fn(),
    open: false,
    title: "Discard this draft?",
  },
  component: AlertDialog,
  parameters: { layout: "fullscreen" },
  render: (args) => <ControlledAlertDialog {...args} />,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Alert Dialog",
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof meta>

export const DestructiveConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Discard draft" }))
    await waitFor(() => expect(page.getByRole("alertdialog", { name: "Discard this draft?" })).toBeVisible())
    await expect(page.queryByRole("button", { name: "Close" })).not.toBeInTheDocument()
  },
}
