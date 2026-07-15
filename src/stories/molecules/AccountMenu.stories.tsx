import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { AccountMenu } from "@/components/molecules/AccountMenu"
import { clinicDashboardFixture } from "@/fixtures/clinic-dashboard"

const meta = {
  component: AccountMenu,
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        mobile320Short: { name: "Mobile 320 short", styles: { height: "700px", width: "320px" } },
      },
    },
  },
  tags: ["autodocs", "layer:molecule", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Molecules/Account Menu",
} satisfies Meta<typeof AccountMenu>

export default meta
type Story = StoryObj<typeof meta>

const account = clinicDashboardFixture.admin
const defaultArgs = {
  avatar: account.avatar,
  initials: account.initials,
  name: account.name,
  role: account.role,
} satisfies Story["args"]

function renderAccountMenu(initialOpen = false) {
  return (
    <div className="flex min-h-screen justify-end p-4">
      <AccountMenu {...defaultArgs} initialOpen={initialOpen} />
    </div>
  )
}

export const Closed: Story = {
  args: defaultArgs,
  render: () => renderAccountMenu(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: `Open account menu for ${account.name}` })

    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await expect(canvas.getByRole("dialog", { name: "Account menu" })).toBeInTheDocument()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
  },
}

export const Open: Story = {
  args: { ...defaultArgs, initialOpen: true },
  render: () => renderAccountMenu(true),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const menu = canvas.getByRole("dialog", { name: "Account menu" })

    await expect(within(menu).getByText(account.name)).toBeInTheDocument()
    await expect(within(menu).getByText(account.role)).toBeInTheDocument()
    await expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: `Open account menu for ${account.name}` })).toHaveFocus(),
    )
  },
}

export const MobileOpen: Story = {
  args: { ...defaultArgs, initialOpen: true },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => renderAccountMenu(true),
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement).getByRole("dialog", { name: "Account menu" })
    const viewportWidth = canvasElement.ownerDocument.defaultView?.innerWidth ?? 320
    const bounds = menu.getBoundingClientRect()

    await expect(bounds.left).toBeGreaterThanOrEqual(15)
    await expect(bounds.right).toBeLessThanOrEqual(viewportWidth - 15)
  },
}
