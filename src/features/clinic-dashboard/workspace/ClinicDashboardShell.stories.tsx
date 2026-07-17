import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { Button } from "@/components/ui/button"
import { ClinicDashboardShell } from "./ClinicDashboardShell"
import { clinicDashboardNavigationItems } from "./navigation"

const meta = {
  args: {
    accountMenu: (
      <Button aria-label="Open account menu" size="icon" variant="ghost">
        SS
      </Button>
    ),
    activeSection: "dashboard",
    children: (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
        Dashboard content
      </div>
    ),
    clinicName: "Berlin Health Clinic",
    items: clinicDashboardNavigationItems,
    onSectionSelect: fn(),
    onSupportRequest: fn(),
  },
  component: ClinicDashboardShell,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:template", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Templates/Clinic Dashboard Shell",
} satisfies Meta<typeof ClinicDashboardShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Mobile: Story = {
  globals: { viewport: { value: "mobile390Tall" } },
}
