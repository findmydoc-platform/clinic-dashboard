import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { ConversationActionsMenu } from "./ConversationActionsMenu"

function ControlledConversationActionsMenu(props: ComponentProps<typeof ConversationActionsMenu>) {
  const [open, setOpen] = useState(props.open)

  return (
    <div className="flex h-36 w-72 items-start justify-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
      <ConversationActionsMenu
        {...props}
        onOpenChange={(nextOpen) => {
          props.onOpenChange(nextOpen)
          setOpen(nextOpen)
        }}
        open={open}
      />
      <button
        className="min-h-11 rounded-lg border border-[var(--border)] px-3 text-sm font-bold text-[var(--secondary)]"
        type="button"
      >
        Outside action
      </button>
    </div>
  )
}

const meta = {
  args: {
    onOpenChange: fn(),
    onToggleUnread: fn(),
    open: true,
    unreadCount: 0,
  },
  component: ConversationActionsMenu,
  render: (args) => <ControlledConversationActionsMenu {...args} />,
  tags: ["domain:messages", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Messages/Molecules/Conversation Actions Menu",
} satisfies Meta<typeof ConversationActionsMenu>

export default meta
type Story = StoryObj<typeof meta>

export const MarkAsUnread: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Conversation menu" })
    const action = canvas.getByRole("menuitem", { name: "Mark as unread" })
    await waitFor(() => expect(action).toHaveFocus())
    await userEvent.click(action)
    await expect(args.onToggleUnread).toHaveBeenCalledOnce()
    await expect(args.onOpenChange).toHaveBeenCalledWith(false)
    await expect(canvas.queryByRole("menu")).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const MarkAsRead: Story = {
  args: { unreadCount: 1 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("menuitem", { name: "Mark as read" })).toBeInTheDocument()
  },
}

export const KeyboardClose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Conversation menu" })
    const action = canvas.getByRole("menuitem", { name: "Mark as unread" })
    await waitFor(() => expect(action).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Home}{End}")
    await expect(action).toHaveFocus()
    await userEvent.keyboard("{Escape}")
    await expect(canvas.queryByRole("menu")).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const OutsideClose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const outsideAction = canvas.getByRole("button", { name: "Outside action" })
    await userEvent.click(outsideAction)
    await expect(canvas.queryByRole("menu")).not.toBeInTheDocument()
    await expect(outsideAction).toHaveFocus()
  },
}

export const TabClose: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const outsideAction = canvas.getByRole("button", { name: "Outside action" })
    await waitFor(() => expect(canvas.getByRole("menuitem")).toHaveFocus())
    await userEvent.tab()
    await expect(canvas.queryByRole("menu")).not.toBeInTheDocument()
    await waitFor(() => expect(outsideAction).toHaveFocus())
  },
}
