import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { FoundationHome } from "@/components/organisms/AppShell/FoundationHome"
import { ClinicDashboardTemplate } from "@/components/templates/ClinicDashboardTemplate"

const meta = {
  component: FoundationHome,
  decorators: [
    (Story) => (
      <ClinicDashboardTemplate>
        <Story />
      </ClinicDashboardTemplate>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs", "layer:organism", "domain:foundation"],
  title: "Domain/Foundation/FoundationHome",
} satisfies Meta<typeof FoundationHome>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
