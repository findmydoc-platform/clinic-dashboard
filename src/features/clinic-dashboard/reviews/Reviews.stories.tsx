import { useState, type ComponentProps } from "react"
import { act } from "@testing-library/react"
import { expect, fn, mocked, userEvent, waitFor, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import {
  createReviewSourceCommandsFixture,
  reviewSourceSnapshotFixture,
} from "./testing/review-source.fixtures"
import { Reviews } from "./Reviews"
import { ReviewSourceCommandError } from "./model/review-source-commands"

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

export const ExactOffListOpening: Story = {
  args: {
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => ({
        id: "off-list-review",
        author: "Quinn R.",
        initials: "QR",
        publicMeasure: "none" as const,
        publicText: "Exact off-list review for the selected notification.",
        rating: 5 as const,
        reviewDate: "2026-10-14T10:00:00.000Z",
        treatment: { id: "dentistry", label: "Dentistry" },
        withdrawalState: "active" as const,
      })),
    },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    openingRequest: { requestId: "opening-review-1", reviewId: "off-list-review" },
    onOpeningResult: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = await canvas.findByRole("region", { name: "Selected review" })
    expect(
      await within(detail).findByText("Exact off-list review for the selected notification."),
    ).toBeVisible()
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "opening-review-1",
        reviewId: "off-list-review",
        status: "displayed",
      }),
    )
    expect(within(detail).getByRole("heading", { name: "Review details" })).toHaveFocus()
    expect(canvas.getByText("Outstanding implant process and excellent communication.")).toBeVisible()
    const treatment = canvas.queryByRole("combobox", { name: "Treatment" })
    if (treatment) expect(treatment).toHaveValue("all")
    else expect(canvas.getByRole("button", { name: "Show filters" })).toBeVisible()
  },
}

const exactReview = {
  id: "off-list-review",
  author: "Quinn R.",
  initials: "QR",
  publicMeasure: "none" as const,
  publicText: "Exact off-list review for the selected notification.",
  rating: 5 as const,
  reviewDate: "2026-10-14T10:00:00.000Z",
  treatment: { id: "dentistry", label: "Dentistry" },
  withdrawalState: "active" as const,
}
function RepeatedOpeningStory(props: ComponentProps<typeof Reviews>) {
  const [requestNumber, setRequestNumber] = useState(0)
  return (
    <>
      <button onClick={() => setRequestNumber((value) => value + 1)}>Open exact review again</button>
      <Reviews
        {...props}
        openingRequest={
          requestNumber > 0
            ? { requestId: `repeat-${requestNumber}`, reviewId: "off-list-review" }
            : undefined
        }
      />
    </>
  )
}
export const RepeatedOpeningRevalidatesCachedReview: Story = {
  args: {
    commands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => exactReview) },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    onOpeningResult: fn(),
  },
  render: (args) => <RepeatedOpeningStory {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Open exact review again" }))
    await waitFor(() => expect(args.onOpeningResult).toHaveBeenCalledTimes(1))
    let resolveReload!: (review: typeof exactReview) => void
    mocked(args.commands.loadReview).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveReload = resolve
        }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Open exact review again" }))
    expect(await canvas.findByText("Loading review details…")).toBeVisible()
    expect(canvas.queryByText("Exact off-list review for the selected notification.")).not.toBeInTheDocument()
    expect(args.onOpeningResult).toHaveBeenCalledTimes(1)
    await act(() => resolveReload({ ...exactReview, publicText: "Revalidated exact review content." }))
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "repeat-2",
        reviewId: "off-list-review",
        status: "displayed",
      }),
    )
    expect(await canvas.findByText("Revalidated exact review content.")).toBeVisible()
    expect(args.commands.loadReview).toHaveBeenCalledTimes(2)
  },
}
export const MissingReviewDoesNotConfirmOpening: Story = {
  args: {
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => {
        throw new Error("Unavailable")
      }),
    },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    openingRequest: { requestId: "missing-1", reviewId: "missing-review" },
    onOpeningResult: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    expect(await canvas.findByText("This review is unavailable.")).toBeVisible()
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "missing-1",
        reviewId: "missing-review",
        status: "unavailable",
      }),
    )
    expect(canvas.getByText("Outstanding implant process and excellent communication.")).toBeVisible()
  },
}
export const ResponseAnchorUsesNormalDetail: Story = {
  args: {
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadHistory: fn(createReviewSourceCommandsFixture().loadHistory),
      loadReview: fn(async () => ({
        ...exactReview,
        response: {
          id: "normal-response",
          status: "approved" as const,
          published: {
            approvedAt: "2026-10-14T10:00:00.000Z",
            body: "Approved response from the ordinary detail.",
          },
        },
      })),
    },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    openingRequest: {
      requestId: "response-1",
      reviewId: "off-list-review",
      anchor: { kind: "response", id: "normal-response" },
    },
    onOpeningResult: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = await canvas.findByRole("region", { name: "Selected review" })
    await waitFor(() =>
      expect(
        within(detail).getByRole("region", {
          name: "Selected review by Quinn R., Dentistry · Clinic response",
        }),
      ).toHaveFocus(),
    )
    expect(args.onOpeningResult).toHaveBeenCalledWith({
      requestId: "response-1",
      reviewId: "off-list-review",
      status: "displayed",
    })
    expect(args.commands.loadHistory).not.toHaveBeenCalled()
  },
}
export const AppealAnchorUsesNormalDetail: Story = {
  args: {
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => ({
        ...exactReview,
        appeal: {
          id: "normal-appeal",
          createdAt: "2026-10-14T09:00:00.000Z",
          decidedAt: "2026-10-14T10:00:00.000Z",
          decisionReason: "Ordinary authorized review detail supplies this outcome.",
          details: "Ordinary authorized review detail supplies this appeal.",
          reason: "other" as const,
          status: "dismissed" as const,
        },
      })),
    },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    openingRequest: {
      requestId: "appeal-1",
      reviewId: "off-list-review",
      anchor: { kind: "appeal", id: "normal-appeal" },
    },
    onOpeningResult: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = await canvas.findByRole("region", { name: "Selected review" })
    await waitFor(() =>
      expect(
        within(detail).getByRole("region", {
          name: "Selected review by Quinn R., Dentistry · Review appeal",
        }),
      ).toHaveFocus(),
    )
    expect(args.onOpeningResult).toHaveBeenCalledWith({
      requestId: "appeal-1",
      reviewId: "off-list-review",
      status: "displayed",
    })
  },
}
export const MissingAnchorFocusesExactReview: Story = {
  args: {
    commands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => exactReview) },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    openingRequest: {
      requestId: "anchor-missing",
      reviewId: "off-list-review",
      anchor: { kind: "occurrence", id: "not-in-detail" },
    },
    onOpeningResult: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = await canvas.findByRole("region", { name: "Selected review" })
    await waitFor(() => expect(within(detail).getByRole("heading", { name: "Review details" })).toHaveFocus())
    expect(args.onOpeningResult).toHaveBeenCalledWith({
      requestId: "anchor-missing",
      reviewId: "off-list-review",
      status: "displayed",
    })
  },
}

export const SupersededOpeningCannotRestoreOldDetail: Story = {
  args: {
    commands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => exactReview) },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    onOpeningResult: fn(),
  },
  render: (args) => <RepeatedOpeningStory {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    let resolveFirst!: (review: typeof exactReview) => void
    mocked(args.commands.loadReview).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve
        }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Open exact review again" }))
    expect(await canvas.findByText("Loading review details…")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Open exact review again" }))
    await waitFor(() =>
      expect(args.onOpeningResult).toHaveBeenCalledWith({
        requestId: "repeat-2",
        reviewId: "off-list-review",
        status: "displayed",
      }),
    )
    await act(() => resolveFirst({ ...exactReview, publicText: "Obsolete response must never appear." }))
    expect(canvas.queryByText("Obsolete response must never appear.")).not.toBeInTheDocument()
    expect(args.onOpeningResult).toHaveBeenCalledTimes(1)
  },
}

export const ExactReadAccessLossClearsRetainedReviews: Story = {
  args: {
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => {
        throw new ReviewSourceCommandError("unauthorized", "Session ended")
      }),
    },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    onSessionLost: fn(),
    openingRequest: { requestId: "access-lost", reviewId: "off-list-review" },
    onOpeningResult: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    expect(await canvas.findByRole("heading", { name: "Reviews unavailable" })).toBeVisible()
    expect(
      canvas.queryByText("Outstanding implant process and excellent communication."),
    ).not.toBeInTheDocument()
    expect(args.onSessionLost).toHaveBeenCalledTimes(1)
    expect(args.onOpeningResult).toHaveBeenCalledWith({
      requestId: "access-lost",
      reviewId: "off-list-review",
      status: "unavailable",
    })
  },
}

export const ExactOffListOpeningMobile: Story = {
  args: ExactOffListOpening.args,
  globals: { viewport: { value: "mobile390Tall" } },
  play: ExactOffListOpening.play,
}
export const ExactOffListOpeningMobileDark: Story = {
  args: ExactOffListOpening.args,
  globals: { viewport: { value: "mobile390Tall" }, theme: "dark" },
  play: ExactOffListOpening.play,
}

function CachedReviewOpeningStory(props: ComponentProps<typeof Reviews>) {
  const [shouldOpen, setShouldOpen] = useState(false)
  return (
    <>
      <button onClick={() => setShouldOpen(true)}>Open cached review with current access</button>
      <Reviews
        {...props}
        openingRequest={
          shouldOpen ? { requestId: "cached-current", reviewId: "review-source-public" } : undefined
        }
      />
    </>
  )
}
const currentWithheldReview = {
  id: "review-source-public",
  author: "Anonymous patient",
  initials: "AP",
  publicMeasure: "removed" as const,
  rating: 5 as const,
  reviewDate: "2026-01-05T10:00:00.000Z",
  treatment: { id: "dentistry", label: "Dentistry" },
  withdrawalState: "active" as const,
}
export const RemovedCurrentDetailReplacesCachedPublicFields: Story = {
  args: {
    commands: { ...createReviewSourceCommandsFixture(), loadReview: fn(async () => currentWithheldReview) },
    showManagement: true,
    snapshot: reviewSourceSnapshotFixture,
    isActive: true,
    onOpeningResult: fn(),
  },
  render: (args) => <CachedReviewOpeningStory {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(canvas.getByText("Outstanding implant process and excellent communication.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Open cached review with current access" }))
    await canvas.findByRole("region", { name: "Selected review" })
    await waitFor(() =>
      expect(
        canvas.queryByText("Outstanding implant process and excellent communication."),
      ).not.toBeInTheDocument(),
    )
    expect(canvas.queryByRole("heading", { name: "Maya K." })).not.toBeInTheDocument()
    expect(canvas.getByRole("combobox", { name: "Visibility" })).toHaveValue("all")
    expect(canvas.queryByRole("region", { name: "Review summary" })).not.toBeInTheDocument()
    expect(canvas.queryByRole("navigation", { name: "Review pages" })).not.toBeInTheDocument()
    expect(canvas.getByText("Review list needs refresh.")).toBeVisible()
  },
}
export const WithdrawnCurrentDetailReplacesCachedPublicFields: Story = {
  args: {
    ...RemovedCurrentDetailReplacesCachedPublicFields.args,
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => ({
        ...currentWithheldReview,
        publicMeasure: "none" as const,
        withdrawalState: "withdrawn" as const,
      })),
    },
  },
  render: (args) => <CachedReviewOpeningStory {...args} />,
  play: RemovedCurrentDetailReplacesCachedPublicFields.play,
}
export const KnownUnavailableDetailRemovesCachedRow: Story = {
  args: {
    ...RemovedCurrentDetailReplacesCachedPublicFields.args,
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReview: fn(async () => {
        throw new ReviewSourceCommandError("not-found", "Unavailable")
      }),
    },
  },
  render: (args) => <CachedReviewOpeningStory {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Open cached review with current access" }))
    expect(await canvas.findByText("This review is unavailable.")).toBeVisible()
    expect(
      canvas.queryByText("Outstanding implant process and excellent communication."),
    ).not.toBeInTheDocument()
    expect(canvas.queryByRole("heading", { name: "Maya K." })).not.toBeInTheDocument()
    expect(canvas.queryByRole("region", { name: "Review summary" })).not.toBeInTheDocument()
    expect(canvas.queryByRole("navigation", { name: "Review pages" })).not.toBeInTheDocument()
    expect(canvas.getByText("Review list needs refresh.")).toBeVisible()
    expect(canvas.getByRole("combobox", { name: "Visibility" })).toHaveValue("all")
  },
}
export const OldListResponseCannotRestoreWithheldReview: Story = {
  args: {
    ...RemovedCurrentDetailReplacesCachedPublicFields.args,
    commands: {
      ...createReviewSourceCommandsFixture(),
      loadReviews: fn(async () => reviewSourceSnapshotFixture),
      loadReview: fn(async () => currentWithheldReview),
    },
  },
  render: (args) => <CachedReviewOpeningStory {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    let resolveList!: (value: typeof reviewSourceSnapshotFixture) => void
    mocked(args.commands.loadReviews).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve
        }),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Refresh" }))
    await userEvent.click(canvas.getByRole("button", { name: "Open cached review with current access" }))
    await waitFor(() =>
      expect(
        canvas.queryByText("Outstanding implant process and excellent communication."),
      ).not.toBeInTheDocument(),
    )
    await act(() => resolveList(reviewSourceSnapshotFixture))
    expect(
      canvas.queryByText("Outstanding implant process and excellent communication."),
    ).not.toBeInTheDocument()
    expect(canvas.queryByRole("heading", { name: "Maya K." })).not.toBeInTheDocument()
    expect(canvas.getByText("Review list needs refresh.")).toBeVisible()
  },
}
