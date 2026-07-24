import type { ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { workspaceAccountFixture } from "../../testing/workspace.fixtures"
import { AccountMenu } from "./AccountMenu"

const meta = {
  component: AccountMenu,
  parameters: {
    layout: "fullscreen",
  },
  render: (args) => renderAccountMenu(args),
  tags: ["domain:workspace", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Molecules/Account Menu",
} satisfies Meta<typeof AccountMenu>

export default meta
type Story = StoryObj<typeof meta>

const account = workspaceAccountFixture
const defaultArgs = {
  avatar: account.avatar,
  email: account.email,
  initials: account.initials,
  name: account.name,
  onSignOut: fn(async () => ({ ok: true })),
  role: account.role,
} satisfies Story["args"]

function renderAccountMenu(args: ComponentProps<typeof AccountMenu>) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] p-4 text-[var(--foreground)]">
      <div className="flex justify-end">
        <AccountMenu {...args} />
      </div>
    </div>
  )
}

export const Closed: Story = {
  args: defaultArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: `Open account menu for ${account.name}` })

    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await expect(page.getByRole("menu")).toBeInTheDocument()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
  },
}

export const KeyboardOpenFocus: Story = {
  args: defaultArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: `Open account menu for ${account.name}` })

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    const profileItem = page.getByRole("menuitem", { name: "Account profile" })
    await waitFor(() => expect(profileItem).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    const themeItem = page.getByRole("menuitemcheckbox", { name: "Dark mode" })
    await expect(themeItem).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(page.getByRole("menuitem", { name: "Sign out" })).toHaveFocus()
  },
}

export const Open: Story = {
  args: { ...defaultArgs, initialOpen: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const menu = page.getByRole("menu")
    const signOut = within(menu).getByRole("menuitem", { name: "Sign out" })

    await expect(within(menu).getByText(account.name)).toBeInTheDocument()
    await expect(within(menu).getByText(account.email)).toBeInTheDocument()
    await expect(within(menu).getByRole("menuitem", { name: "Account profile" })).toBeInTheDocument()
    await expect(within(menu).getByRole("menuitemcheckbox", { name: "Dark mode" })).not.toBeChecked()
    await expect(signOut).toHaveAttribute("type", "button")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: `Open account menu for ${account.name}` })).toHaveFocus(),
    )
  },
}

export const ProfileDialog: Story = {
  args: defaultArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: `Open account menu for ${account.name}` })

    await userEvent.click(trigger)
    await userEvent.click(page.getByRole("menuitem", { name: "Account profile" }))

    const dialog = page.getByRole("dialog", { name: "Staff profile" })
    const closeButton = within(dialog).getByRole("button", { name: "Close" })

    await waitFor(() => expect(closeButton).toHaveFocus())
    await expect(within(dialog).getByText(account.name)).toBeInTheDocument()
    await expect(within(dialog).getByText(account.role)).toBeInTheDocument()
    await expect(within(dialog).getByText(account.email)).toBeInTheDocument()
    await expect(dialog.querySelector("img")).toHaveAttribute("alt", "")
    await expect(within(dialog).getAllByRole("button")).toHaveLength(1)
    await expect(dialog).not.toHaveTextContent(
      /authenticated|authentication|password|phone|signed-in|two-factor/i,
    )

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())

    await userEvent.click(trigger)
    await userEvent.click(page.getByRole("menuitem", { name: "Account profile" }))
    await waitFor(() => expect(dialog).toHaveAttribute("open"))
  },
}

export const SignOutSubmits: Story = {
  args: { ...defaultArgs, initialOpen: true, onSignOut: fn(async () => ({ ok: true })) },
  play: async ({ args, canvasElement }) => {
    const menu = within(canvasElement.ownerDocument.body).getByRole("menu")
    const signOut = within(menu).getByRole("menuitem", { name: "Sign out" })

    await userEvent.click(signOut)
    await expect(args.onSignOut).toHaveBeenCalledOnce()
  },
}

export const SignOutFailure: Story = {
  args: {
    ...defaultArgs,
    initialOpen: true,
    onSignOut: fn(async () => ({ message: "Sign out failed. Please try again.", ok: false })),
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("menuitem", { name: "Sign out" }))
    const alert = await page.findByRole("alert")
    await expect(alert).toHaveTextContent("Sign out failed")
    await waitFor(() => expect(alert).toHaveFocus())
  },
}

export const ProfileDialogDark: Story = {
  args: defaultArgs,
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: `Open account menu for ${account.name}` })

    await userEvent.click(trigger)
    await expect(page.getByRole("menuitemcheckbox", { name: "Dark mode" })).toBeChecked()
    await userEvent.click(page.getByRole("menuitem", { name: "Account profile" }))

    const dialog = page.getByRole("dialog", { name: "Staff profile" })
    await expect(within(dialog).getByText(account.name)).toBeInTheDocument()
    await expect(within(dialog).getByText(account.role)).toBeInTheDocument()
    await expect(within(dialog).getByText(account.email)).toBeInTheDocument()
    await expect(within(dialog).getAllByRole("button")).toHaveLength(1)
  },
}

export const MobileOpen: Story = {
  args: { ...defaultArgs, initialOpen: true },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement.ownerDocument.body).getByRole("menu")
    const viewportWidth = canvasElement.ownerDocument.defaultView?.innerWidth ?? 320
    const bounds = menu.getBoundingClientRect()

    await expect(bounds.left).toBeGreaterThanOrEqual(15)
    await expect(bounds.right).toBeLessThanOrEqual(viewportWidth - 15)
  },
}
