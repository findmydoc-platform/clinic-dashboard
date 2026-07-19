import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { Reviews } from "./Reviews"
import type { ReviewsSnapshot } from "./model/reviews-snapshot"
import {
  createReviewCommandsFixture,
  createRetryReviewCommandsFixture,
  reviewsFixture,
} from "./testing/reviews.fixtures"

const meta = {
  component: Reviews,
  parameters: { layout: "fullscreen" },
  tags: ["domain:reviews", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Reviews/Organisms/Reviews",
} satisfies Meta<typeof Reviews>

export default meta
type Story = StoryObj<typeof meta>

const publishedEditSnapshot: ReviewsSnapshot = {
  ...reviewsFixture,
  items: reviewsFixture.items.map((review) =>
    review.id === "review-markus-schmidt"
      ? { ...review, pendingResponse: undefined, revision: review.revision - 1 }
      : review,
  ),
}

function createReviewsArgs(
  showManagement = true,
  snapshot: ReviewsSnapshot = reviewsFixture,
): ComponentProps<typeof Reviews> {
  return {
    commands: createReviewCommandsFixture(),
    showManagement,
    snapshot,
  }
}

function getOpenReview(canvasElement: HTMLElement) {
  const review = canvasElement.querySelector<HTMLElement>('[data-review-status="Open"]')
  if (!review) throw new Error("Expected an open review in the fixture")
  return review
}

export const VisualReference: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Manage patient feedback and respond to reviews.")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Apply filters" })).toBeDisabled()
    await expect(canvas.getByRole("button", { name: "Edit pending response" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Responses locked" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: /export/i })).not.toBeInTheDocument()
  },
}

export const NewResponsePendingModeration: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)

    await userEvent.click(within(openReview).getByRole("button", { name: "Respond" }))
    const responseDialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.type(
      within(responseDialog).getByLabelText("Response for moderation"),
      "Thank you for the helpful feedback. We will review the reception process.",
    )
    await userEvent.click(within(responseDialog).getByRole("button", { name: "Save moderation preview" }))
    await waitFor(() =>
      expect(
        page.getByText("Demo only — response saved locally; nothing was submitted."),
      ).toBeInTheDocument(),
    )
    await expect(within(openReview).getByText("Open")).toBeInTheDocument()
    await expect(within(openReview).queryByText("Answered")).not.toBeInTheDocument()
    await expect(within(openReview).getByText("Pending moderation")).toBeInTheDocument()
    await expect(within(openReview).getByText(/reception process/)).toBeInTheDocument()
    const editPendingResponse = within(openReview).getByRole("button", {
      name: "Edit pending response",
    })
    await expect(editPendingResponse).toHaveFocus()
    await expect(
      within(openReview).queryByRole("button", { name: /retry|withdraw/i }),
    ).not.toBeInTheDocument()

    await userEvent.click(editPendingResponse)
    const editDialog = page.getByRole("dialog", { name: "Respond to review" })
    const editResponse = within(editDialog).getByLabelText("Response for moderation")
    const editSubmit = within(editDialog).getByRole("button", { name: "Save moderation preview" })
    await expect(editSubmit).toBeDisabled()
    await userEvent.clear(editResponse)
    await userEvent.type(editResponse, "Thank you. Our reception process has now been reviewed.")
    await expect(editSubmit).toBeEnabled()
    await userEvent.click(editSubmit)
    await waitFor(() => expect(within(openReview).getByText(/has now been reviewed/)).toBeInTheDocument())
  },
}

export const PublishedResponseEditPendingModeration: Story = {
  args: createReviewsArgs(true, publishedEditSnapshot),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const publishedReview = canvas
      .getByText("Markus Schmidt")
      .closest<HTMLElement>('[data-review-status="Answered"]')
    if (!publishedReview) throw new Error("Expected a published response review in the fixture")
    const publishedResponse =
      "Thank you for your kind feedback. We are pleased that you are happy with the result."

    await expect(within(publishedReview).getByText(publishedResponse)).toBeInTheDocument()
    await userEvent.click(within(publishedReview).getByRole("button", { name: "Edit response" }))
    const dialog = page.getByRole("dialog", { name: "Respond to review" })
    const responseDraft = within(dialog).getByLabelText("Response for moderation")
    const savePreview = within(dialog).getByRole("button", { name: "Save moderation preview" })
    await expect(responseDraft).toHaveValue(publishedResponse)
    await expect(savePreview).toBeDisabled()
    await userEvent.clear(responseDraft)
    await userEvent.type(responseDraft, "Thank you. We have shared your feedback with the clinic team.")
    await expect(savePreview).toBeEnabled()
    await userEvent.click(savePreview)

    await waitFor(() => expect(within(publishedReview).getByText("Pending moderation")).toBeInTheDocument())
    await expect(within(publishedReview).getByText(publishedResponse)).toBeInTheDocument()
    await expect(within(publishedReview).getByText("Answered")).toBeInTheDocument()
    await expect(
      within(publishedReview).getByText("Thank you. We have shared your feedback with the clinic team."),
    ).toBeInTheDocument()
    await expect(
      within(publishedReview).queryByRole("button", { name: /retry|withdraw/i }),
    ).not.toBeInTheDocument()
  },
}

export const PendingModerationDark: Story = {
  args: createReviewsArgs(),
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const publishedReview = canvas
      .getByText("Markus Schmidt")
      .closest<HTMLElement>('[data-review-status="Answered"]')
    if (!publishedReview) throw new Error("Expected a pending response fixture")

    await expect(within(publishedReview).getByText("Published clinic response")).toBeInTheDocument()
    await expect(within(publishedReview).getByText("Pending moderation")).toBeInTheDocument()
    await expect(
      within(publishedReview).queryByRole("button", { name: /retry|withdraw/i }),
    ).not.toBeInTheDocument()
  },
}

export const ResponseDialogDismissal: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)
    const respond = within(openReview).getByRole("button", { name: "Respond" })

    await userEvent.click(respond)
    let dialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Respond to review" })).toBeNull())
    await expect(respond).toHaveFocus()

    await userEvent.click(respond)
    dialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Respond to review" })).toBeNull())
    await expect(respond).toHaveFocus()
  },
}

export const PendingModerationMobile320: Story = {
  args: createReviewsArgs(),
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pending = canvas.getByText("Pending moderation").closest<HTMLElement>("[data-review-status]")
    if (!pending) throw new Error("Expected a pending moderation review card")

    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    const bounds = pending.getBoundingClientRect()
    await expect(bounds.left).toBeGreaterThanOrEqual(-0.5)
    await expect(bounds.right).toBeLessThanOrEqual(canvasElement.clientWidth + 0.5)
  },
}

export const AppealCaseLifecycle: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)

    await userEvent.click(within(openReview).getByRole("button", { name: "Appeal" }))
    const dialog = page.getByRole("dialog", { name: "Appeal review" })
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Reason" }),
      "Incorrect clinic",
    )
    await userEvent.type(
      within(dialog).getByLabelText("Appeal details"),
      "This review belongs to another clinic.",
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Save appeal preview" }))

    await waitFor(() =>
      expect(
        page.getByText("Demo only — appeal case saved locally; nothing was submitted or sent."),
      ).toBeInTheDocument(),
    )
    await expect(within(openReview).getByText("Open")).toBeInTheDocument()
    await expect(within(openReview).queryByRole("button", { name: "Appeal" })).toBeNull()
    await expect(within(openReview).queryByText("APPEAL-REVIEW-ANONYMOUS-DENTISTRY")).toBeNull()

    await userEvent.click(within(openReview).getByRole("button", { name: "History" }))
    const historyDialog = page.getByRole("dialog", { name: "Review history" })
    await expect(within(historyDialog).getByText("APPEAL-REVIEW-ANONYMOUS-DENTISTRY")).toBeInTheDocument()
    await expect(within(within(historyDialog).getByRole("list")).getAllByRole("listitem")).toHaveLength(1)
    await userEvent.click(within(historyDialog).getByRole("button", { name: "Mark as under review" }))

    await waitFor(() =>
      expect(
        page.getByText("Demo only — appeal case updated locally; nothing was submitted or sent."),
      ).toBeInTheDocument(),
    )
    await expect(within(openReview).getByText("Under review")).toBeInTheDocument()
    await expect(within(openReview).getByRole("button", { name: "Responses locked" })).toBeDisabled()
    await expect(within(within(historyDialog).getByRole("list")).getAllByRole("listitem")).toHaveLength(2)
    await expect(within(historyDialog).queryByRole("button", { name: "Mark as under review" })).toBeNull()
    await expect(
      within(historyDialog).queryByRole("button", { name: /approve|reject|final decision|retry|withdraw/i }),
    ).toBeNull()
  },
}

export const AppealDialogFocusReturn: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)
    const appeal = within(openReview).getByRole("button", { name: "Appeal" })

    await userEvent.click(appeal)
    let dialog = page.getByRole("dialog", { name: "Appeal review" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Appeal review" })).toBeNull())
    await expect(appeal).toHaveFocus()

    await userEvent.click(appeal)
    dialog = page.getByRole("dialog", { name: "Appeal review" })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Appeal review" })).toBeNull())
    await expect(appeal).toHaveFocus()
  },
}

export const ReviewHistoryFocusReturn: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)
    const history = within(openReview).getByRole("button", { name: "History" })

    await userEvent.click(history)
    let dialog = page.getByRole("dialog", { name: "Review history" })
    await userEvent.click(within(dialog).getAllByRole("button", { name: "Close" }).at(-1)!)
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Review history" })).toBeNull())
    await expect(history).toHaveFocus()

    await userEvent.click(history)
    dialog = page.getByRole("dialog", { name: "Review history" })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Review history" })).toBeNull())
    await expect(history).toHaveFocus()
  },
}

export const NoteHistory: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)

    await userEvent.click(within(openReview).getByRole("button", { name: "Internal note" }))
    const noteDialog = page.getByRole("dialog", { name: "Add internal note" })
    await userEvent.type(within(noteDialog).getByLabelText("Internal note"), "Reception follow-up recorded.")
    await userEvent.click(within(noteDialog).getByRole("button", { name: "Save note" }))
    await waitFor(() => expect(page.getByText("Internal note saved.")).toBeInTheDocument())

    await userEvent.click(within(openReview).getByRole("button", { name: "History" }))
    const historyDialog = page.getByRole("dialog", { name: "Review history" })
    await expect(within(historyDialog).getByText("Reception follow-up recorded.")).toBeInTheDocument()
  },
}

export const PaginationNavigation: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Review page 2" }))
    await expect(canvas.getByText("Elena Fischer")).toBeInTheDocument()
    await expect(canvas.queryByText("Markus Schmidt")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Review page 1" }))
    await expect(canvas.getByText("Markus Schmidt")).toBeInTheDocument()
  },
}

export const FilterApplication: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.selectOptions(canvas.getByLabelText("Status"), "Under review")
    await userEvent.click(canvas.getByRole("button", { name: "Apply filters" }))
    await expect(canvas.getByText("Review filters applied.")).toBeInTheDocument()
    await expect(canvas.getByText("Janine Doe")).toBeInTheDocument()
    await expect(canvas.queryByText("Markus Schmidt")).not.toBeInTheDocument()
    await expect(canvas.getAllByRole("button", { name: "Responses locked" })[0]).toBeDisabled()
  },
}

export const RefreshFeedback: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Refresh reviews" }))
    await waitFor(() => expect(canvas.getByText("Reviews refreshed.")).toBeInTheDocument())
  },
}

export const MobileFilters: Story = {
  args: createReviewsArgs(),
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Show filters" })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(trigger)
    await expect(canvas.getByLabelText("Period")).toBeInTheDocument()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
  },
}

function RetryReviews(props: ComponentProps<typeof Reviews>) {
  const commands = useMemo(() => createRetryReviewCommandsFixture(), [])

  return <Reviews {...props} commands={commands} />
}

function CapabilityToggleReviews(props: ComponentProps<typeof Reviews>) {
  const [showManagement, setShowManagement] = useState(true)
  const commands = useMemo(() => createReviewCommandsFixture(), [])
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => toggleRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [showManagement])

  return (
    <>
      <Button onClick={() => setShowManagement((current) => !current)} ref={toggleRef}>
        {showManagement ? "Disable review management" : "Enable review management"}
      </Button>
      <Reviews {...props} commands={commands} showManagement={showManagement} />
    </>
  )
}

function DeferredMutationCapabilityToggleReviews(props: ComponentProps<typeof Reviews>) {
  const [hasDeferredResponse, setHasDeferredResponse] = useState(false)
  const [showManagement, setShowManagement] = useState(true)
  const deferredResponseResolveRef = useRef<(() => void) | undefined>(undefined)
  const commands = useMemo(() => {
    const baseCommands = createReviewCommandsFixture()

    return {
      ...baseCommands,
      submitReviewResponseForModeration: async (
        ...input: Parameters<typeof baseCommands.submitReviewResponseForModeration>
      ) => {
        await new Promise<void>((resolve) => {
          deferredResponseResolveRef.current = resolve
          setHasDeferredResponse(true)
        })
        return baseCommands.submitReviewResponseForModeration(...input)
      },
    }
  }, [])

  const resolveDeferredResponse = () => {
    const resolve = deferredResponseResolveRef.current
    deferredResponseResolveRef.current = undefined
    setHasDeferredResponse(false)
    resolve?.()
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowManagement((current) => !current)}>
          {showManagement ? "Disable review management" : "Enable review management"}
        </Button>
        <Button disabled={!hasDeferredResponse} onClick={resolveDeferredResponse} variant="outline">
          Resolve deferred command
        </Button>
      </div>
      <Reviews {...props} commands={commands} showManagement={showManagement} />
    </>
  )
}

export const MutationRetry: Story = {
  args: createReviewsArgs(),
  render: (args) => <RetryReviews {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)
    await userEvent.click(within(openReview).getByRole("button", { name: "Respond" }))
    const dialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.type(
      within(dialog).getByLabelText("Response for moderation"),
      "A valid retry response for this review.",
    )
    const submit = within(dialog).getByRole("button", { name: "Save moderation preview" })
    await userEvent.click(submit)
    await expect(within(dialog).getByRole("alert")).toHaveTextContent("couldn't save")
    await expect(submit).toBeEnabled()
    await userEvent.click(submit)
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Respond to review" })).not.toBeInTheDocument(),
    )
    await expect(within(openReview).getByText("Open")).toBeInTheDocument()
    await expect(within(openReview).getByText("Pending moderation")).toBeInTheDocument()
  },
}

export const Presentation: Story = {
  args: createReviewsArgs(false),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByText("View patient feedback and published review activity.")).toBeInTheDocument()
    await expect(canvas.getByText("Based on 1,248 reviews")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /export/i })).not.toBeInTheDocument()
    const threeStarRating = canvas.getByRole("img", { name: "3 out of 5 stars" })
    await expect(threeStarRating.querySelectorAll('[data-star-state="full"]')).toHaveLength(3)
    await expect(threeStarRating.querySelectorAll('[data-star-state="empty"]')).toHaveLength(2)
    await expect(canvas.queryByText("Pending moderation")).not.toBeInTheDocument()
    await expect(canvas.queryByText(/APPEAL-REVIEW-/)).not.toBeInTheDocument()
    await expect(canvas.queryByText("Incorrect clinic")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "History" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Appeal" })).not.toBeInTheDocument()
  },
}

export const CapabilityWithdrawalProjectsSnapshot: Story = {
  args: createReviewsArgs(),
  globals: { viewport: { value: "mobile390Tall" } },
  render: (args) => <CapabilityToggleReviews {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "Show filters" }))
    await userEvent.selectOptions(canvas.getByLabelText("Status"), "Under review")
    await userEvent.click(canvas.getByRole("button", { name: "Apply filters" }))
    await expect(canvas.getByText("Review filters applied.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Show filters" }))
    await userEvent.click(canvas.getByRole("button", { name: "Refresh reviews" }))
    await expect(canvas.getByRole("button", { name: "Refreshing reviews" })).toBeDisabled()
    await userEvent.click(canvas.getAllByRole("button", { name: "History" })[0]!)
    await expect(page.getByRole("dialog", { name: "Review history" })).toBeVisible()

    await userEvent.click(canvas.getByRole("button", { name: "Disable review management" }))

    const enableManagement = canvas.getByRole("button", { name: "Enable review management" })
    await waitFor(() => expect(enableManagement).toHaveFocus())
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Review history" })).not.toBeInTheDocument(),
    )
    await expect(canvas.queryByText("Review filters applied.")).not.toBeInTheDocument()
    await expect(canvas.queryByLabelText("Status")).not.toBeInTheDocument()
    await expect(canvas.getByText("View patient feedback and published review activity.")).toBeInTheDocument()
    await expect(canvas.getByText("Markus Schmidt")).toBeVisible()

    await new Promise((resolve) => setTimeout(resolve, 400))
    await userEvent.click(enableManagement)

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Disable review management" })).toHaveFocus(),
    )
    await expect(canvas.getByText("Manage patient feedback and respond to reviews.")).toBeInTheDocument()
    await expect(page.queryByRole("dialog", { name: "Review history" })).not.toBeInTheDocument()
    await expect(canvas.queryByText("Reviews refreshed.")).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Show filters" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    await expect(canvas.getByText("Janine Doe")).toBeVisible()
    await expect(canvas.queryByText("Markus Schmidt")).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Show filters" }))
    await expect(canvas.getByLabelText("Status")).toHaveValue("Under review")
    await expect(canvas.getByRole("button", { name: "Refresh reviews" })).toBeEnabled()
  },
}

export const CapabilityWithdrawalDiscardsPendingMutation: Story = {
  args: createReviewsArgs(),
  render: (args) => <DeferredMutationCapabilityToggleReviews {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)
    const response = "This response must be discarded after management is withdrawn."

    await userEvent.click(within(openReview).getByRole("button", { name: "Respond" }))
    const responseDialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.type(within(responseDialog).getByLabelText("Response for moderation"), response)
    await userEvent.click(within(responseDialog).getByRole("button", { name: "Save moderation preview" }))
    await expect(canvas.getByRole("button", { name: "Resolve deferred command" })).toBeEnabled()

    await userEvent.click(canvas.getByRole("button", { name: "Disable review management" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Respond to review" })).not.toBeInTheDocument(),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Resolve deferred command" }))
    await userEvent.click(canvas.getByRole("button", { name: "Enable review management" }))

    await expect(canvas.getByText("Manage patient feedback and respond to reviews.")).toBeInTheDocument()
    await expect(
      canvas.queryByText("Demo only — response saved locally; nothing was submitted."),
    ).not.toBeInTheDocument()
    await expect(canvas.queryByText(response)).not.toBeInTheDocument()
    await expect(within(getOpenReview(canvasElement)).getByText("Open")).toBeInTheDocument()
    await expect(page.queryByRole("dialog", { name: "Respond to review" })).not.toBeInTheDocument()
  },
}
