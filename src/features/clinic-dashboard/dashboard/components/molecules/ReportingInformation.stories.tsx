import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ReportingInformation } from "./ReportingInformation"

const meta = {
  component: ReportingInformation,
  args: {
    label: "Session conversion",
    children: "Only sessions with analytics consent are measured. Each session counts at most once.",
  },
  tags: ["domain:dashboard", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Molecules/Reporting Information",
} satisfies Meta<typeof ReportingInformation>
export default meta
type Story = StoryObj<typeof meta>

export const HoverExplanation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(document.body)
    const trigger = canvas.getByRole("button", { name: "About Session conversion" })
    await userEvent.hover(trigger)
    await expect(await page.findByRole("dialog", { name: "About Session conversion" })).toBeVisible()
    await userEvent.unhover(trigger)
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "About Session conversion" })).not.toBeInTheDocument(),
    )
  },
}

export const KeyboardExplanation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(document.body)
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "About Session conversion" })).toHaveFocus()
    await expect(page.getByRole("dialog", { name: "About Session conversion" })).toHaveTextContent(
      "analytics consent",
    )
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "About Session conversion" })).not.toBeInTheDocument(),
    )
    await expect(canvas.getByRole("button", { name: "About Session conversion" })).toHaveFocus()
  },
}

export const NarrowViewport: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: "About Session conversion" }))
    const popup = page.getByRole("dialog", { name: "About Session conversion" })
    await expect(popup).toBeVisible()
    const bounds = popup.getBoundingClientRect()
    await expect(bounds.left).toBeGreaterThanOrEqual(0)
    await expect(bounds.right).toBeLessThanOrEqual(window.innerWidth)
    await userEvent.click(page.getByRole("button", { name: "Close explanation" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "About Session conversion" })).not.toBeInTheDocument(),
    )
  },
}

export const DarkExplanation: Story = {
  ...NarrowViewport,
  globals: { theme: "dark", viewport: { value: "mobile320Short" } },
}
