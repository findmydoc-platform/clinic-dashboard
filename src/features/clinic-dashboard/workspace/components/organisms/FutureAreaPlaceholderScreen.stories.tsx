import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { FutureAreaPlaceholderScreen } from "./FutureAreaPlaceholderScreen"

const meta = {
  args: {
    description:
      "This area is a visual placeholder only. Subscription details and actions are not available in this demo.",
    heading: "Subscriptions",
  },
  component: FutureAreaPlaceholderScreen,
  parameters: { layout: "padded" },
  tags: ["domain:workspace", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Organisms/Future Area Placeholder Screen",
} satisfies Meta<typeof FutureAreaPlaceholderScreen>

export default meta
type Story = StoryObj<typeof meta>

async function assertPlaceholderContract(canvasElement: HTMLElement, heading: string, description: string) {
  const canvas = within(canvasElement)
  const region = canvas.getByRole("region", { name: heading })

  await expect(within(region).getByRole("heading", { level: 1, name: heading })).toBeInTheDocument()
  await expect(within(region).getByText(description)).toBeInTheDocument()
  await expect(region).not.toHaveAttribute("aria-busy")
  await expect(within(region).queryByRole("progressbar")).not.toBeInTheDocument()
  await expect(region.querySelector("[aria-live]")).not.toBeInTheDocument()
  await expect(region.querySelector('[role="status"]')).not.toBeInTheDocument()
  await expect(region.querySelector('[role="alert"]')).not.toBeInTheDocument()
  await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
  await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
  await expect(region.querySelector("a[href], button, form, input, select, textarea")).not.toBeInTheDocument()

  const decorativeBlocks = region.querySelectorAll("[data-placeholder-block]")
  await expect(decorativeBlocks).toHaveLength(8)
  for (const block of decorativeBlocks) await expect(block).toHaveAttribute("aria-hidden", "true")
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await assertPlaceholderContract(
      canvasElement,
      "Subscriptions",
      "This area is a visual placeholder only. Subscription details and actions are not available in this demo.",
    )
  },
}

export const CertificatesAndAccreditations: Story = {
  args: {
    description:
      "This area is a visual placeholder only. Certificate and accreditation details and actions are not available in this demo.",
    heading: "Certificates and accreditations",
  },
  play: async ({ canvasElement }) => {
    await assertPlaceholderContract(
      canvasElement,
      "Certificates and accreditations",
      "This area is a visual placeholder only. Certificate and accreditation details and actions are not available in this demo.",
    )
  },
}

export const At320: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    await assertPlaceholderContract(
      canvasElement,
      "Subscriptions",
      "This area is a visual placeholder only. Subscription details and actions are not available in this demo.",
    )
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const Dark: Story = {
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await assertPlaceholderContract(
      canvasElement,
      "Subscriptions",
      "This area is a visual placeholder only. Subscription details and actions are not available in this demo.",
    )
  },
}
