import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { inquiryDetailFixtures, spamInquiryFixture } from "../../testing/public"
import { InquiryActionsMenu } from "./InquiryActionsMenu"

const meta = {
  args: {
    hasPendingReplyDraft: false,
    inquiry: inquiryDetailFixtures.open,
    isMutating: false,
    onLifecycleToggle: async (): Promise<boolean> => true,
    onMarkReadToggle: async () => undefined,
    onSpamToggle: async (): Promise<boolean> => true,
  },
  component: InquiryActionsMenu,
  tags: ["domain:messages", "layer:molecule", "status:stable"],
  title: "Clinic Dashboard/Messages/Molecules/Inquiry Actions Menu",
} satisfies Meta<typeof InquiryActionsMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "More actions" }))
    await expect(await page.findByRole("menuitem", { name: "Close conversation" })).toBeVisible()
    await userEvent.click(canvasElement.ownerDocument.body)
    await expect(page.queryByRole("menuitem", { name: "Close conversation" })).not.toBeInTheDocument()
  },
}

export const SpamReason: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "More actions" }))
    await userEvent.click(await page.findByRole("menuitem", { name: "Mark as spam" }))
    await expect(await page.findByRole("dialog", { name: "Mark inquiry as spam?" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Mark as spam" })).toBeDisabled()
  },
}

export const CloseWithDraftWarning: Story = {
  args: { hasPendingReplyDraft: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "More actions" }))
    await userEvent.click(await page.findByRole("menuitem", { name: "Close conversation" }))
    const dialog = await page.findByRole("dialog", { name: "Close conversation?" })
    await expect(within(dialog).getByText(/discards the unsent patient reply/)).toBeVisible()
    await expect(within(dialog).getByRole("textbox", { name: "Close reason" })).toBeVisible()
  },
}

export const FailedCloseKeepsReason: Story = {
  args: { onLifecycleToggle: fn(async () => false) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "More actions" }))
    await userEvent.click(await page.findByRole("menuitem", { name: "Close conversation" }))
    const dialog = await page.findByRole("dialog", { name: "Close conversation?" })
    const reason = within(dialog).getByRole("textbox", { name: "Close reason" })
    await userEvent.type(reason, "Keep this synthetic reason after failure.")
    await userEvent.click(within(dialog).getByRole("button", { name: "Close conversation" }))

    await expect(dialog).toBeVisible()
    await expect(reason).toHaveValue("Keep this synthetic reason after failure.")
  },
}

export const ExistingSpam: Story = {
  args: {
    inquiry: {
      ...spamInquiryFixture,
      actions: { ...spamInquiryFixture.actions, canChangeLifecycle: false },
    },
    onSpamToggle: fn(async () => true),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "More actions" }))
    const removeSpam = await page.findByRole("menuitem", { name: "Remove spam label" })
    await expect(removeSpam).toBeEnabled()
    await userEvent.click(removeSpam)
    await expect(args.onSpamToggle).toHaveBeenCalledOnce()
  },
}
