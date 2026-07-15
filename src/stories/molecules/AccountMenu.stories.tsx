import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { AccountMenu } from "@/components/molecules/AccountMenu"
import { ThemeProvider } from "@/components/organisms/AppShell/ThemeProvider"
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

function renderAccountMenu(initialOpen = false, theme: "dark" | "light" = "light") {
  return (
    <ThemeProvider attribute="class" enableSystem={false} forcedTheme={theme}>
      <div className="min-h-screen bg-[var(--canvas)] p-4 text-[var(--foreground)]">
        <div className="flex justify-end">
          <AccountMenu {...defaultArgs} initialOpen={initialOpen} />
        </div>
      </div>
    </ThemeProvider>
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
    await expect(within(menu).getByRole("switch", { name: "Dark mode" })).not.toBeChecked()
    await expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: `Open account menu for ${account.name}` })).toHaveFocus(),
    )
  },
}

export const OpenDark: Story = {
  args: { ...defaultArgs, initialOpen: true },
  render: () => renderAccountMenu(true, "dark"),
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement).getByRole("dialog", { name: "Account menu" })

    await waitFor(() => expect(within(menu).getByRole("switch", { name: "Dark mode" })).toBeChecked())
    await expect(within(menu).getByText(account.name)).toBeInTheDocument()
    await expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument()
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
