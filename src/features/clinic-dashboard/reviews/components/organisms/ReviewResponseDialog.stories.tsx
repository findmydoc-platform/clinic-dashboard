import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { act } from "@testing-library/react"
import { expect, fn, mocked, userEvent, waitFor, within } from "storybook/test"
import { reviewSourceRecordsFixture } from "../../testing/review-source.fixtures"
import { ReviewResponseDialog } from "./ReviewResponseDialog"
const meta = {
  component: ReviewResponseDialog,
  tags: ["domain:reviews", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Reviews/Organisms/Review Response Dialog",
} satisfies Meta<typeof ReviewResponseDialog>
export default meta
type Story = StoryObj<typeof meta>
export const NewResponse: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    review: reviewSourceRecordsFixture[2],
  },
}
export const PendingRevision: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    review: reviewSourceRecordsFixture[1],
  },
}

export const NavigationWaitsForSubmission: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    onNavigationRequestChange: fn(),
    review: reviewSourceRecordsFixture[2],
  },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    let resolveSubmission!: (result: "applied") => void
    mocked(args.onSubmit).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve
        }),
    )
    const input = await body.findByRole("textbox", { name: "Clinic response" })
    await userEvent.type(input, "The reply must be submitted before continuing.")
    const continuation = fn()
    const request = mocked(args.onNavigationRequestChange!).mock.lastCall?.[0]
    await act(() => request?.(continuation))
    await userEvent.click(await body.findByRole("button", { name: "Submit and continue" }))
    expect(continuation).not.toHaveBeenCalled()
    expect(input).toBeDisabled()
    const busyContinuation = fn()
    const busyCancelled = fn()
    await act(() => request?.(busyContinuation, busyCancelled))
    expect(busyCancelled).toHaveBeenCalledTimes(1)
    expect(busyContinuation).not.toHaveBeenCalled()
    await act(() => resolveSubmission("applied"))
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1))
    // A replacement request during the write cancels the original continuation.
    expect(continuation).not.toHaveBeenCalled()
  },
}

export const SubmitAndContinue: Story = {
  args: {
    onClose: fn(),
    onSubmit: fn(async () => "applied" as const),
    onNavigationRequestChange: fn(),
    review: reviewSourceRecordsFixture[2],
  },
  play: async ({ args, canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(
      await body.findByRole("textbox", { name: "Clinic response" }),
      "The patient response is ready to submit.",
    )
    const continuation = fn()
    const request = mocked(args.onNavigationRequestChange!).mock.lastCall?.[0]
    await act(() => request?.(continuation))
    await userEvent.click(await body.findByRole("button", { name: "Submit and continue" }))
    await waitFor(() => expect(continuation).toHaveBeenCalledTimes(1))
    expect(args.onSubmit).toHaveBeenCalledWith("The patient response is ready to submit.")
    expect(args.onClose).toHaveBeenCalledTimes(1)
  },
}
