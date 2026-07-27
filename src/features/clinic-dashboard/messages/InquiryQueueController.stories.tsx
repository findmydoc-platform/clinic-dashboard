import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { getPatientInquiryStatusTransitions } from "./model/inquiries"
import { inquiryQueueFixture, secondaryInquiryFixture } from "./testing/public"
import { InquiryQueue } from "./InquiryQueueController"

const storyInquiries = [...inquiryQueueFixture.inquiries, secondaryInquiryFixture]

const commands = {
  updateStatus: async ({ inquiryId, status }) => {
    const inquiry = storyInquiries.find(({ id }) => id === inquiryId)
    if (!inquiry) throw new Error("Unknown story inquiry")

    return {
      changedAt: "11:08",
      inquiry: {
        ...inquiry,
        availableTransitions: getPatientInquiryStatusTransitions(status),
        status,
      },
    }
  },
} satisfies NonNullable<React.ComponentProps<typeof InquiryQueue>["commands"]>

const meta = {
  args: {
    commands,
    snapshot: inquiryQueueFixture,
  },
  component: InquiryQueue,
  globals: { viewport: { value: "desktop1440" } },
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Messages/Organisms/Inquiry Queue",
} satisfies Meta<typeof InquiryQueue>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: {} }

export const StatusUpdated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const statusTrigger = canvas.getByRole("button", {
      name: "Change inquiry status. Current status: Submitted",
    })

    statusTrigger.focus()
    await userEvent.keyboard("{Enter}")
    const nextStatus = await page.findByRole("menuitem", { name: "In review" })
    await expect(nextStatus).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    const updatedTrigger = await canvas.findByRole("button", {
      name: "Change inquiry status. Current status: In review",
    })
    await expect(updatedTrigger).toBeVisible()
    await expect(updatedTrigger).toHaveFocus()
    await expect(canvas.getByText("Status changed from Submitted to In review · 11:08")).toBeVisible()
    await expect(canvas.queryByRole("textbox", { name: "Write a message" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "View patient inquiry" })).not.toBeInTheDocument()
  },
}

export const SearchShowsVisibleInquiry: Story = {
  args: {
    snapshot: {
      inquiries: storyInquiries,
      status: "ready",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByRole("searchbox", { name: "Search inquiries" }), "Aylin")
    await expect(canvas.getByRole("heading", { name: "Aylin Kaya" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Aylin Kaya/ })).toHaveAttribute("aria-pressed", "true")
  },
}

export const SearchWithoutResults: Story = {
  args: {
    snapshot: {
      inquiries: storyInquiries,
      status: "ready",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByRole("searchbox", { name: "Search inquiries" }), "no matching inquiry")
    await expect(canvas.getByText("No inquiries found")).toBeVisible()
    await expect(canvas.getByText("Select an inquiry to review its details.")).toBeVisible()
    await expect(canvas.queryByRole("region", { name: /Inquiry from/ })).not.toBeInTheDocument()
  },
}

export const MobileLight: Story = {
  globals: {
    theme: "light",
    viewport: { value: "mobile390Tall" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(canvas.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Back to inquiries" }))
    await waitFor(() => expect(canvas.getByRole("button", { name: /Lukas Weber/ })).toHaveFocus())
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const MobileDark: Story = {
  globals: {
    theme: "dark",
    viewport: { value: "mobile320Short" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(canvas.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const StatusFailure: Story = {
  args: {
    commands: {
      updateStatus: async () => {
        throw new Error("Story-only status failure")
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(
      canvas.getByRole("button", {
        name: "Change inquiry status. Current status: Submitted",
      }),
    )
    await userEvent.click(await page.findByRole("menuitem", { name: "In review" }))

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "The inquiry status could not be updated.",
    )
  },
}
