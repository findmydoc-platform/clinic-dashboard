import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import type { InquiryWorkspaceCommands } from "./model/inquiry-status-commands"
import {
  inquiryCommandsFixture as commands,
  closedInquiryFixture,
  inquiryQueueFixture,
} from "./testing/public"
import { InquiryQueue } from "./InquiryQueueController"

const meta = {
  args: {
    clinicId: "controlled-clinic",
    commands,
    isActive: true,
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()
  },
}

export const InquirySelectedAndReplied: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    const reply = await canvas.findByRole("textbox", { name: "Reply to patient" })
    await userEvent.type(reply, "We can review this synthetic case.")
    await userEvent.click(canvas.getByRole("button", { name: "Send reply" }))

    await expect(await canvas.findByText("We can review this synthetic case.")).toBeVisible()
    await expect(reply).toHaveValue("")
  },
}

export const HandlingStatusUpdated: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    const status = await canvas.findByRole("combobox", { name: "Inquiry status" })
    await userEvent.selectOptions(status, "in_review")
    await waitFor(() => expect(status).toHaveValue("in_review"))
  },
}

export const MobileListAndDetail: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(await canvas.findByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Back to inquiries" }))
    await waitFor(() => expect(canvas.getByRole("button", { name: /Lukas Weber/ })).toHaveFocus())
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const DeepLinkedInquiryOutsideFirstPage: Story = {
  args: {
    focusInquiryId: closedInquiryFixture.id,
    onFocusHandled: fn(),
    snapshot: {
      changeCursor: inquiryQueueFixture.changeCursor,
      inquiries: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.inquiries.slice(0, 2) : [],
      nextCursor: "story-next-page",
      status: "ready",
      unchanged: false,
      unreadCount: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.unreadCount : 0,
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("region", { name: "Inquiry from Markus Schmidt" })).toBeVisible()
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Markus Schmidt" })).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const ForeignDeepLinkKeepsQueueUsable: Story = {
  args: {
    commands: {
      ...commands,
      loadDetail: async () => ({ error: { code: "not-found" }, ok: false }),
    },
    focusInquiryId: "inquiry-foreign-clinic",
    snapshot: {
      changeCursor: inquiryQueueFixture.changeCursor,
      inquiries: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.inquiries.slice(0, 2) : [],
      nextCursor: "story-next-page",
      status: "ready",
      unchanged: false,
      unreadCount: inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.unreadCount : 0,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(await canvas.findByRole("heading", { name: "Select an inquiry" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Lukas Weber/ })).toBeEnabled()
    await expect(canvas.queryByText("inquiry-foreign-clinic")).not.toBeInTheDocument()
  },
}

export const DetailFailure: Story = {
  args: {
    commands: {
      ...commands,
      loadDetail: async () => ({ error: { code: "service-unavailable" }, ok: false }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(await canvas.findByRole("heading", { name: "Inquiry could not be loaded" })).toBeVisible()
  },
}

export const RepeatedExactOpeningWaitsForDisplay: Story = {
  args: { onOpeningResult: fn() },
  render: function RepeatedOpening(args) {
    const [request, setRequest] = useState({ requestId: "opening-1", inquiryId: closedInquiryFixture.id })
    const [source] = useState(() => {
      let calls = 0
      let finish: (() => void) | undefined
      return {
        finish: () => finish?.(),
        commands: {
          ...commands,
          loadDetail: fn(async (input: Parameters<InquiryWorkspaceCommands["loadDetail"]>[0]) => {
            calls += 1
            if (calls > 1)
              await new Promise<void>((resolve) => {
                finish = resolve
              })
            return commands.loadDetail(input)
          }),
        },
      }
    })
    return (
      <>
        <button onClick={() => setRequest({ ...request, requestId: "opening-2" })}>Open again</button>
        <button onClick={source.finish}>Finish exact load</button>
        <InquiryQueue {...args} commands={source.commands} openingRequest={request} />
      </>
    )
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "opening-1",
        inquiryId: closedInquiryFixture.id,
        status: "displayed",
      }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Open again" }))
    await expect(args.onOpeningResult).toHaveBeenCalledTimes(1)
    await expect(
      canvas.queryByRole("region", { name: "Inquiry from Markus Schmidt" }),
    ).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Finish exact load" }))
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "opening-2",
        inquiryId: closedInquiryFixture.id,
        status: "displayed",
      }),
    )
    await expect(canvas.getByRole("heading", { name: "Markus Schmidt" })).toHaveFocus()
  },
}

export const ReplacedOpeningDiscardsOldResponse: Story = {
  args: { onOpeningResult: fn() },
  render: function ReplacedOpening(args) {
    const [request, setRequest] = useState<{ requestId: string; inquiryId: string }>({
      requestId: "old-opening",
      inquiryId: closedInquiryFixture.id,
    })
    const [source] = useState(() => {
      let release: (() => void) | undefined
      return {
        release: () => release?.(),
        commands: {
          ...commands,
          async loadDetail(input: Parameters<InquiryWorkspaceCommands["loadDetail"]>[0]) {
            if (input.inquiryId === closedInquiryFixture.id)
              await new Promise<void>((resolve) => {
                release = resolve
              })
            return commands.loadDetail(input)
          },
        },
      }
    })
    return (
      <>
        <button onClick={() => setRequest({ requestId: "new-opening", inquiryId: "inquiry-lukas-weber" })}>
          Replace opening
        </button>
        <button onClick={source.release}>Release old load</button>
        <InquiryQueue {...args} commands={source.commands} openingRequest={request} />
      </>
    )
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Replace opening" }))
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "new-opening",
        inquiryId: "inquiry-lukas-weber",
        status: "displayed",
      }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Release old load" }))
    await expect(args.onOpeningResult).toHaveBeenCalledOnce()
    await expect(
      canvas.queryByRole("region", { name: "Inquiry from Markus Schmidt" }),
    ).not.toBeInTheDocument()
  },
}
export const MissingAnchorStillDisplaysExactRecord: Story = {
  args: {
    openingRequest: {
      requestId: "missing-anchor",
      inquiryId: closedInquiryFixture.id,
      anchor: { kind: "message", id: "missing-message" },
    },
    onOpeningResult: fn(),
  },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "missing-anchor",
        inquiryId: closedInquiryFixture.id,
        status: "displayed",
      }),
    )
    await expect(canvas.getByRole("heading", { name: "Markus Schmidt" })).toHaveFocus()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const AvailableMessageAnchorUsesNormalDetail: Story = {
  args: {
    openingRequest: {
      requestId: "visible-message",
      inquiryId: "inquiry-lukas-weber",
      anchor: { kind: "message", id: "lukas-patient-file" },
    },
    onOpeningResult: fn(),
    commands: { ...commands, loadDetail: fn(commands.loadDetail) },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(args.onOpeningResult).toHaveBeenCalledOnce())
    await expect(canvas.getByRole("group", { name: "Message from Patient at 11:02" })).toHaveFocus()
    await expect(args.commands!.loadDetail).toHaveBeenCalledOnce()
  },
}
