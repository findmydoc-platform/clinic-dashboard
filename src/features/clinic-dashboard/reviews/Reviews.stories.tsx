import { useMemo, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Reviews } from "./Reviews"
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

function createReviewsArgs(showManagement = true): ComponentProps<typeof Reviews> {
  return {
    commands: createReviewCommandsFixture(),
    data: reviewsFixture,
    showManagement,
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
    await expect(canvas.getByRole("button", { name: "Apply filters" })).toBeDisabled()
    await expect(canvas.getByRole("button", { name: "Edit response" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Responses locked" })).toBeDisabled()
  },
}

export const ResponseLifecycle: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)

    await userEvent.click(within(openReview).getByRole("button", { name: "Respond" }))
    const responseDialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.type(
      within(responseDialog).getByLabelText("Public response"),
      "Thank you for the helpful feedback. We will review the reception process.",
    )
    await userEvent.click(within(responseDialog).getByRole("button", { name: "Save response" }))
    await waitFor(() => expect(page.getByText("Review response saved.")).toBeInTheDocument())
    await expect(within(openReview).getByText("Answered")).toBeInTheDocument()
    await expect(within(openReview).getByText(/reception process/)).toBeInTheDocument()

    await userEvent.click(within(openReview).getByRole("button", { name: "Edit response" }))
    const editDialog = page.getByRole("dialog", { name: "Respond to review" })
    const editResponse = within(editDialog).getByLabelText("Public response")
    await userEvent.clear(editResponse)
    await userEvent.type(editResponse, "Thank you. Our reception process has now been reviewed.")
    await userEvent.click(within(editDialog).getByRole("button", { name: "Save response" }))
    await waitFor(() => expect(within(openReview).getByText(/has now been reviewed/)).toBeInTheDocument())
  },
}

export const AppealSubmission: Story = {
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
    await userEvent.click(within(dialog).getByRole("button", { name: "Submit appeal" }))

    await waitFor(() => expect(page.getByText("Appeal submitted for moderation.")).toBeInTheDocument())
    await expect(within(openReview).getByText("Under review")).toBeInTheDocument()
    await expect(within(openReview).getByRole("button", { name: "Responses locked" })).toBeDisabled()
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

export const ExportFeedback: Story = {
  args: createReviewsArgs(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole("button", { name: "Export" }))
    await expect(canvas.getByText("Review CSV exported.")).toBeInTheDocument()
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

export const MutationRetry: Story = {
  args: createReviewsArgs(),
  render: (args) => <RetryReviews {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openReview = getOpenReview(canvasElement)
    await userEvent.click(within(openReview).getByRole("button", { name: "Respond" }))
    const dialog = page.getByRole("dialog", { name: "Respond to review" })
    await userEvent.type(
      within(dialog).getByLabelText("Public response"),
      "A valid retry response for this review.",
    )
    const submit = within(dialog).getByRole("button", { name: "Save response" })
    await userEvent.click(submit)
    await expect(within(dialog).getByRole("alert")).toHaveTextContent("couldn't save")
    await expect(submit).toBeEnabled()
    await userEvent.click(submit)
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Respond to review" })).not.toBeInTheDocument(),
    )
    await expect(within(openReview).getByText("Answered")).toBeInTheDocument()
  },
}

export const Presentation: Story = {
  args: createReviewsArgs(false),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByText("Based on 1,248 reviews")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Export" })).not.toBeInTheDocument()
    const threeStarRating = canvas.getByRole("img", { name: "3 out of 5 stars" })
    await expect(threeStarRating.querySelectorAll('[data-star-state="full"]')).toHaveLength(3)
    await expect(threeStarRating.querySelectorAll('[data-star-state="empty"]')).toHaveLength(2)
  },
}
