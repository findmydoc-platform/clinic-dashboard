import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { PageHeading } from "./page-heading"

const meta = {
  component: PageHeading,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Page Heading",
} satisfies Meta<typeof PageHeading>

export default meta
type Story = StoryObj<typeof meta>

export const WithDescription: Story = {
  args: {
    children: "Dashboard",
    description: "A clear view of your clinic's visibility, enquiries, and profile health.",
  },
}
