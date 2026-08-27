import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { InquiryPlainText } from "./InquiryPlainText"

const meta = {
  args: {
    text: "First line\nReview https://example.com/synthetic-record.\nDo not link javascript:alert(1), ftp://example.com/file or https://user:pass@example.com/private.",
  },
  component: InquiryPlainText,
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry Plain Text",
} satisfies Meta<typeof InquiryPlainText>

export default meta
type Story = StoryObj<typeof meta>

export const SafeLinksAndLineBreaks: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: "https://example.com/synthetic-record" })

    await expect(link).toHaveAttribute("href", "https://example.com/synthetic-record")
    await expect(link).toHaveAttribute("rel", "noopener noreferrer")
    await expect(canvas.queryByRole("link", { name: /javascript/ })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("link", { name: /ftp/ })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("link", { name: /user:pass/ })).not.toBeInTheDocument()
    await expect(canvasElement).toHaveTextContent("https://user:pass@example.com/private")
    await expect(canvasElement).toHaveTextContent("First line Review")
  },
}
