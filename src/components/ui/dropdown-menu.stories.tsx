import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MoreHorizontal } from "lucide-react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"

function DropdownMenuExample() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-56 w-80 items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
      <DropdownMenu onOpenChange={setOpen} open={open}>
        <DropdownMenu.Trigger asChild>
          <Button aria-label="Open example menu" size="icon" variant="ghost">
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" aria-label="Example menu">
          <DropdownMenu.Item>View details</DropdownMenu.Item>
          <DropdownMenu.CheckboxItem
            checked={notificationsEnabled}
            onCheckedChange={(checked) => setNotificationsEnabled(checked === true)}
            onSelect={(event) => event.preventDefault()}
          >
            Notifications
            <DropdownMenu.ItemIndicator />
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator />
          <DropdownMenu.Item variant="destructive">Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
      <Button variant="outline">Outside action</Button>
    </div>
  )
}

const meta = {
  args: {
    children: null,
    onOpenChange: () => undefined,
    open: false,
  },
  component: DropdownMenu,
  render: () => <DropdownMenuExample />,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Dropdown Menu",
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: "Open example menu" })
    const outsideAction = canvas.getByRole("button", { name: "Outside action" })

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")

    const firstItem = await page.findByRole("menuitem", { name: "View details" })
    const checkboxItem = page.getByRole("menuitemcheckbox", { name: "Notifications" })
    const destructiveItem = page.getByRole("menuitem", { name: "Delete" })
    await waitFor(() => expect(firstItem).toHaveFocus())

    await userEvent.keyboard("{ArrowDown}")
    await expect(checkboxItem).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(checkboxItem).toBeChecked()
    await userEvent.keyboard("{End}")
    await expect(destructiveItem).toHaveFocus()
    await userEvent.keyboard("{Home}{Escape}")
    await expect(page.queryByRole("menu")).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())

    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(page.getByRole("menuitem", { name: "View details" })).toHaveFocus())
    await userEvent.tab()
    await expect(page.queryByRole("menu")).not.toBeInTheDocument()
    await waitFor(() => expect(outsideAction).toHaveFocus())
  },
}
