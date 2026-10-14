import { act } from "@testing-library/react"
import { expect, fn, mocked, userEvent, waitFor, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import {
  createReviewSourceCommandsFixture,
  reviewSourceSnapshotFixture,
} from "./testing/review-source.fixtures"
import { Reviews } from "./Reviews"

const meta = {
  component: Reviews,
  parameters: { layout: "fullscreen" },
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Reviews",
} satisfies Meta<typeof Reviews>
export default meta
type Story = StoryObj<typeof meta>
export const VisualReference: Story = {
  args: {
    commands: createReviewSourceCommandsFixture(),
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
  },
}
export const ReadOnly: Story = {
  args: {
    commands: createReviewSourceCommandsFixture(),
    showManagement: false,
    snapshot: reviewSourceSnapshotFixture,
  },
}
export const Unavailable: Story = {
  args: { commands: createReviewSourceCommandsFixture(), showManagement: true },
}

export const ResponseNavigationPreservesDraft: Story = {
  args: {
    commands: createReviewSourceCommandsFixture(),
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    onNavigationRequestChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getAllByRole("button", { name: "Respond" })[0])
    const input = await body.findByRole("textbox", { name: "Clinic response" })
    await userEvent.clear(input)
    await userEvent.type(input, "My unsent response must remain here.")
    await userEvent.keyboard("{Home}{Shift>}{ArrowRight}{ArrowRight}{/Shift}")
    const selection = [
      (input as HTMLTextAreaElement).selectionStart,
      (input as HTMLTextAreaElement).selectionEnd,
    ]
    const continueNavigation = fn()
    const request = mocked(args.onNavigationRequestChange!).mock.lastCall?.[0]
    expect(request).toEqual(expect.any(Function))
    await act(() => request?.(continueNavigation))
    await userEvent.click(await body.findByRole("button", { name: "Keep editing" }))
    expect(input).toHaveValue("My unsent response must remain here.")
    expect([
      (input as HTMLTextAreaElement).selectionStart,
      (input as HTMLTextAreaElement).selectionEnd,
    ]).toEqual(selection)
    expect(continueNavigation).not.toHaveBeenCalled()
    await act(() => request?.(continueNavigation))
    await userEvent.click(await body.findByRole("button", { name: "Discard and continue" }))
    await waitFor(() => expect(continueNavigation).toHaveBeenCalledTimes(1))
    expect(body.queryByRole("textbox", { name: "Clinic response" })).not.toBeInTheDocument()
  },
}

export const AppealNavigationPreservesDraft: Story = {
  args: {
    commands: createReviewSourceCommandsFixture(),
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    onNavigationRequestChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getAllByRole("button", { name: "Submit appeal" })[0])
    const input = await body.findByRole("textbox", { name: "Appeal details" })
    const reason = body.getByRole("combobox", { name: "Reason" })
    await userEvent.selectOptions(reason, "other")
    await userEvent.type(input, "My appeal details must remain untouched.")
    const continuation = fn()
    const cancelled = fn()
    const request = mocked(args.onNavigationRequestChange!).mock.lastCall?.[0]
    await act(() => request?.(continuation, cancelled))
    await userEvent.click(await body.findByRole("button", { name: "Keep editing" }))
    expect(input).toHaveValue("My appeal details must remain untouched.")
    expect(reason).toHaveValue("other")
    expect(cancelled).toHaveBeenCalledTimes(1)
    expect(continuation).not.toHaveBeenCalled()
  },
}
