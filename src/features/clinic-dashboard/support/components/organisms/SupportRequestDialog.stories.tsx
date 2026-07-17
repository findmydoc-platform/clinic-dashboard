import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { SupportRequestDialog } from "./SupportRequestDialog"

const meta = {
  args: {
    commands: {
      submitSupportRequest: fn(async () => ({
        expectedResponse: "within one business day",
        ticketId: "FMD-1042",
      })),
    },
    onOpenChange: fn(),
    open: true,
  },
  component: SupportRequestDialog,
  tags: ["domain:support", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Support/Organisms/Support Request Dialog",
} satisfies Meta<typeof SupportRequestDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Send support request" }))
    await expect(canvas.getByText("Choose a support category.")).toBeInTheDocument()
    await expect(canvas.getByRole("combobox", { name: "Category" })).toHaveFocus()
  },
}

export const ScreenshotKeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const replyChannel = canvas.getByRole("combobox", { name: "Preferred reply channel" })
    const screenshot = canvas.getByLabelText("Optional screenshot")
    const focusSurface = canvas.getByText("PNG or JPG, up to 5 MB").parentElement
    if (!focusSurface) throw new Error("Screenshot focus surface is missing.")

    replyChannel.focus()
    await userEvent.tab()

    await expect(screenshot).toHaveFocus()
    await expect(focusSurface).toHaveStyle({ outlineStyle: "solid", outlineWidth: "2px" })
  },
}

export const FailedSubmissionCanRetry: Story = {
  render: (args) => {
    let submissionCount = 0
    const commands = {
      submitSupportRequest: fn(async () => {
        submissionCount += 1
        if (submissionCount === 1) throw new Error("Temporary support failure")
        return {
          expectedResponse: "within one business day",
          ticketId: "FMD-1043",
        }
      }),
    }

    return <SupportRequestDialog {...args} commands={commands} />
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Category" }), "Technical issue")
    await userEvent.type(canvas.getByRole("textbox", { name: "Subject" }), "Profile update failed")
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Message" }),
      "The clinic profile does not update after I save the changes.",
    )

    await userEvent.click(canvas.getByRole("button", { name: "Send support request" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We couldn't send the support request. Check the details and try again.",
    )

    await userEvent.click(canvas.getByRole("button", { name: "Send support request" }))
    await expect(await canvas.findByRole("status")).toHaveTextContent("FMD-1043")
  },
}
