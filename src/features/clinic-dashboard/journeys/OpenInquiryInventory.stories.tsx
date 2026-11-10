import { useState } from "react"
import { authenticatedClinicContextFixture } from "@/features/clinic-dashboard/workspace/testing/public"
import type { InquiryOpenInventoryCommands } from "@/features/clinic-dashboard/messages/public"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { inquiryCommandsFixture } from "@/features/clinic-dashboard/messages/testing/public"
import { ClinicDashboardWorkspaceHarness } from "@/features/clinic-dashboard/workspace/testing/public"

const meta = {
  component: ClinicDashboardWorkspaceHarness,
  args: {
    prototypeMode: "presentation",
    inquiryInventoryCommands: {
      loadOpenInventory: fn(async () => ({ ok: true, value: { count: 104 } }) as const),
    },
  },
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:stable"],
  title: "Clinic Dashboard/Journeys/Pages/Open Inquiry Inventory",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>
export default meta
type Story = StoryObj<typeof meta>

export const CompleteInventoryAndDestination: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = await canvas.findByRole("button", { name: "Open inquiries" })
    await expect(within(card).getByText("104")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "90 days" }))
    await userEvent.click(canvas.getByRole("button", { name: /Inquiries 7/ }))
    await userEvent.click(card)
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    await expect(canvas.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: /Inquiries 7/ })).toHaveAttribute("aria-pressed", "true")
  },
}

export const EmptyInventoryRemainsNavigable: Story = {
  args: {
    inquiryInventoryCommands: {
      loadOpenInventory: fn(async () => ({ ok: true, value: { count: 0 } }) as const),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = await canvas.findByRole("button", { name: "Open inquiries" })
    await expect(within(card).getByText("No open inquiries")).toBeVisible()
    await expect(within(card).getByText("0")).toBeVisible()
    await userEvent.click(card)
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
  },
}

export const FailureAndIndependentRetry: Story = {
  args: {
    inquiryInventoryCommands: {
      loadOpenInventory: fn(async () => ({ ok: false, error: { code: "service-unavailable" } }) as const),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByText("Unavailable")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Profile views 284" })).toBeVisible()
    ;(args.inquiryInventoryCommands!.loadOpenInventory as ReturnType<typeof fn>).mockResolvedValue({
      ok: true,
      value: { count: 9 },
    })
    await userEvent.click(canvas.getByRole("button", { name: "Retry Open inquiries" }))
    await expect(within(canvas.getByRole("button", { name: "Open inquiries" })).getByText("9")).toBeVisible()
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible()
  },
}

export const SafeEntryPreservesUnreadAndDraft: Story = {
  args: {
    inquiryCommands: {
      ...inquiryCommandsFixture,
      changeReadPosition: fn(inquiryCommandsFixture.changeReadPosition),
      changeState: fn(inquiryCommandsFixture.changeState),
      loadDetail: fn(inquiryCommandsFixture.loadDetail),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const originalConfirm = window.confirm
    window.confirm = () => true
    try {
      await userEvent.click(canvas.getByRole("button", { name: /^Inquiries$/ }))
      await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
      const draft = await canvas.findByRole("textbox", { name: "Reply to patient" })
      await userEvent.type(draft, "Preserve this unsent reply.")
      await userEvent.click(canvas.getByRole("button", { name: "More actions" }))
      await userEvent.click(
        within(canvasElement.ownerDocument.body).getByRole("menuitem", { name: "Mark as unread" }),
      )
      await userEvent.click(canvas.getByRole("button", { name: "Back to inquiries" }))
      await userEvent.type(
        canvas.getByRole("searchbox", { name: "Search inquiries" }),
        "existing restriction",
      )
      await userEvent.click(canvas.getByRole("button", { name: "Filter by status. All statuses" }))
      await userEvent.click(
        within(canvasElement.ownerDocument.body).getByRole("menuitemcheckbox", { name: "In review" }),
      )
      await userEvent.keyboard("{Escape}")
      const changes = (args.inquiryCommands!.changeReadPosition as ReturnType<typeof fn>).mock.calls.length
      const opens = (args.inquiryCommands!.loadDetail as ReturnType<typeof fn>).mock.calls.length
      await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
      await userEvent.click(canvas.getByRole("button", { name: "Open inquiries" }))
      await expect(canvas.getByRole("searchbox", { name: "Search inquiries" })).toHaveValue("")
      await expect(canvas.getByRole("button", { name: "Filter by status. All statuses" })).toBeVisible()
      await expect(canvas.getByRole("button", { name: /^open$/i })).toHaveAttribute("aria-pressed", "true")
      await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toHaveFocus()
      await expect(canvas.queryByRole("region", { name: "Inquiry from Lukas Weber" })).not.toBeInTheDocument()
      await expect(args.inquiryCommands!.changeReadPosition).toHaveBeenCalledTimes(changes)
      await expect(args.inquiryCommands!.changeState).not.toHaveBeenCalled()
      await expect(args.inquiryCommands!.loadDetail).toHaveBeenCalledTimes(opens)
      await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
      await waitFor(() =>
        expect(canvas.getByRole("textbox", { name: "Reply to patient" })).toHaveValue(
          "Preserve this unsent reply.",
        ),
      )
    } finally {
      window.confirm = originalConfirm
    }
  },
}

function DelayedScopeHarness() {
  const [scope, setScope] = useState("first")
  const [release, setRelease] = useState<(() => void) | undefined>()
  const [commands] = useState<InquiryOpenInventoryCommands>(() => ({
    loadOpenInventory: () =>
      new Promise((resolve) => setRelease(() => () => resolve({ ok: true, value: { count: 818 } }))),
  }))
  const [nextCommands] = useState<InquiryOpenInventoryCommands>(() => ({
    loadOpenInventory: async () => ({ ok: true, value: { count: 7 } }),
  }))
  return (
    <>
      <button onClick={() => setScope("second")}>Change principal and clinic</button>
      <button disabled={!release} onClick={() => release?.()}>
        Release previous result
      </button>
      <ClinicDashboardWorkspaceHarness
        prototypeMode="presentation"
        authenticatedContext={{
          ...authenticatedClinicContextFixture,
          principal: { ...authenticatedClinicContextFixture.principal, id: scope },
          clinic: { ...authenticatedClinicContextFixture.clinic, id: scope },
        }}
        inquiryInventoryCommands={scope === "first" ? commands : nextCommands}
      />
    </>
  )
}

export const RejectsDelayedPreviousScope: Story = {
  render: () => <DelayedScopeHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("status", { name: "Loading Open inquiries" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Change principal and clinic" }))
    await waitFor(() =>
      expect(within(canvas.getByRole("button", { name: "Open inquiries" })).getByText("7")).toBeVisible(),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Release previous result" }))
    await expect(within(canvas.getByRole("button", { name: "Open inquiries" })).getByText("7")).toBeVisible()
    await expect(canvas.queryByText("818")).not.toBeInTheDocument()
  },
}
