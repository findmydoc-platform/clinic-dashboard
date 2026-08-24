import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import {
  dashboardProfileProgressConflict,
  dashboardProfileProgressDraft,
  dashboardProfileProgressPublishReady,
  dashboardProfileTasks,
} from "../../testing/dashboard.fixtures"
import { ProfileTaskDialog } from "./ProfileTaskDialog"

const meta = {
  component: ProfileTaskDialog,
  render: (args) => <ControlledProfileTaskDialog key={args.task.id} {...args} />,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Profile Task Dialog",
} satisfies Meta<typeof ProfileTaskDialog>

export default meta
type Story = StoryObj<typeof meta>

function ControlledProfileTaskDialog(props: ComponentProps<typeof ProfileTaskDialog>) {
  const [open, setOpen] = useState(props.open)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open profile task</Button>
      <ProfileTaskDialog
        {...props}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          props.onOpenChange(nextOpen)
        }}
        open={open}
      />
    </>
  )
}

const defaultArgs = {
  onOpenChange: fn(),
  onProfileDestinationOpen: fn(),
  open: false,
  task: dashboardProfileTasks[0]!,
} satisfies Story["args"]

export const CategoryTask: Story = {
  args: defaultArgs,
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const trigger = page.getByRole("button", { name: "Open profile task" })

    await userEvent.click(trigger)
    const dialog = page.getByRole("dialog", { name: "Complete basic information" })
    await expect(within(dialog).getByText("Why this matters")).toBeVisible()
    await expect(within(dialog).getByText("Clinic name")).toBeVisible()
    await expect(within(dialog).getByText("Clinic description")).toBeVisible()
    await expect(within(dialog).getByText("Publish a valid clinic name and description.")).toBeVisible()
    await expect(within(dialog).queryByText(/priority|qualified inquiries|study/i)).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Edit basic information" }))
    await expect(args.onProfileDestinationOpen).toHaveBeenCalledWith("basic-information")
    await userEvent.click(within(dialog).getByText("Close", { selector: "button" }))
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const ClinicImagesGuidance: Story = {
  args: { ...defaultArgs, task: dashboardProfileTasks[4]! },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(page.getByRole("button", { name: "Open profile task" }))
    const dialog = page.getByRole("dialog", { name: "Add clinic images" })
    const dialogContent = within(dialog).getByLabelText("Add clinic images content")
    const guidance = within(dialog).getByRole("complementary", { name: "Profile task guidance" })
    const footer = dialog.querySelector<HTMLElement>("footer")

    if (!footer) throw new Error("Expected the profile task dialog footer")

    await expect(guidance).toHaveTextContent(
      "Choose one clear main image that represents your clinic, then add at least two distinct supporting views. Avoid near-duplicates.",
    )
    await expect(within(dialog).getByText("What is missing")).toBeInTheDocument()
    await expect(within(dialog).getByText("Complete when")).toBeInTheDocument()
    await expect(within(footer).getByRole("button", { name: "Close" })).toBeVisible()
    await expect(within(footer).getByRole("button", { name: "Edit clinic images" })).toBeVisible()
    await expect(dialogContent.scrollTop).toBe(0)
    await expect(guidance.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      dialogContent.getBoundingClientRect().top,
    )
    await expect(guidance.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      dialogContent.getBoundingClientRect().bottom + 0.5,
    )
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
  },
}

export const CompleteDraft: Story = {
  args: { ...defaultArgs, task: dashboardProfileProgressDraft.tasks[0]! },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(page.getByRole("button", { name: "Open profile task" }))
    const dialog = page.getByRole("dialog", { name: "Complete profile draft" })
    await expect(within(dialog).getByText("Address")).toBeVisible()
    await expect(within(dialog).getByText("Opening hours")).toBeVisible()
    await expect(within(dialog).getByRole("button", { name: "Continue editing" })).toBeVisible()
  },
}

export const PublishDraft: Story = {
  args: { ...defaultArgs, task: dashboardProfileProgressPublishReady.tasks[0]! },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(page.getByRole("button", { name: "Open profile task" }))
    const dialog = page.getByRole("dialog", { name: "Publish profile changes" })
    await expect(within(dialog).getByText("Basic information")).toBeVisible()
    await expect(within(dialog).getByText("Opening hours")).toBeVisible()
    await expect(within(dialog).getByRole("button", { name: "Review & publish" })).toBeVisible()
  },
}

export const ReviewConflictedDraft: Story = {
  args: { ...defaultArgs, task: dashboardProfileProgressConflict.tasks[0]! },
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(page.getByRole("button", { name: "Open profile task" }))
    const dialog = page.getByRole("dialog", { name: "Review profile changes" })
    await expect(within(dialog).getByRole("button", { name: "Review changes" })).toBeVisible()
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
  },
}
