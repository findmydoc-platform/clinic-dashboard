import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, mocked, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspaceHarness } from "@/features/clinic-dashboard/workspace/testing/public"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import { createReviewSourceCommandsFixture } from "@/features/clinic-dashboard/reviews/testing/public"

const meta = {
  component: ClinicDashboardWorkspaceHarness,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Review Workload",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>
export default meta
type Story = StoryObj<typeof meta>

export const PublishedEntry: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadWorkload: fn(async () => ({ reviewsToAnswerCount: 14, pendingModerationCount: 2 })),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Period" }), "7")
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Rating" }), "1")
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Treatment" }), "dentistry")
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Visibility" }), "removed")
    await userEvent.click(canvas.getByRole("button", { name: "Apply" }))
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    const card = await canvas.findByRole("button", { name: /Reviews to answer/u })
    expect(within(card).getByText("14")).toBeVisible()
    expect(within(card).getByText("2 responses pending moderation")).toBeVisible()
    await userEvent.click(card)
    expect(await canvas.findByRole("heading", { name: "Reviews" })).toBeVisible()
    expect(canvas.getByRole("combobox", { name: "Visibility" })).toHaveValue("published")
    expect(canvas.getByRole("combobox", { name: "Period" })).toHaveValue("all")
    expect(canvas.getByRole("combobox", { name: "Rating" })).toHaveValue("all")
    expect(canvas.getByRole("combobox", { name: "Treatment" })).toHaveValue("all")
  },
}

export const EmptyWithPendingModeration: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadWorkload: fn(async () => ({ reviewsToAnswerCount: 0, pendingModerationCount: 1 })),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = await canvas.findByRole("button", { name: "Reviews to answer" })
    expect(await within(card).findByText("No reviews awaiting your response")).toBeVisible()
    expect(within(card).getByText("0")).toBeVisible()
    expect(within(card).getByText("1 response pending moderation")).toBeVisible()
    await userEvent.click(card)
    expect(await canvas.findByRole("heading", { name: "Reviews" })).toBeVisible()
  },
}
export const FailureAndIndependentRetry: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadWorkload: fn(async () => {
        throw new Error("Synthetic source unavailable")
      }),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const retry = await canvas.findByRole("button", { name: "Retry Reviews to answer" })
    expect(
      within(canvas.getByRole("button", { name: "Reviews to answer" })).getByText("Unavailable"),
    ).toBeVisible()
    mocked(args.reviewCommands!.loadWorkload).mockResolvedValueOnce({
      reviewsToAnswerCount: 6,
      pendingModerationCount: 2,
    })
    await userEvent.click(retry)
    expect(await canvas.findByRole("heading", { name: "Dashboard" })).toBeVisible()
    expect(
      await within(canvas.getByRole("button", { name: "Reviews to answer" })).findByText("6"),
    ).toBeVisible()
  },
}
export const Loading: Story = {
  args: {
    prototypeMode: "presentation",
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadWorkload: fn(
        () =>
          new Promise<
            Awaited<ReturnType<ReturnType<typeof createReviewSourceCommandsFixture>["loadWorkload"]>>
          >(() => undefined),
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(await canvas.findByRole("status", { name: "Loading Reviews to answer" })).toBeVisible()
    expect(
      within(canvas.getByRole("button", { name: "Reviews to answer" })).queryByText("0"),
    ).not.toBeInTheDocument()
  },
}

export const ReportingDemo: Story = {
  args: { ...PublishedEntry.args, reportingDemo: dashboardFixture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(
      await canvas.findByText("Reporting demo. Sample measurements, charts and downloads are illustrative."),
    ).toBeVisible()
    const card = await canvas.findByRole("button", { name: "Reviews to answer" })
    expect(await within(card).findByText("14")).toBeVisible()
    await userEvent.click(card)
    expect(await canvas.findByRole("heading", { name: "Reviews" })).toBeVisible()
    expect(canvas.getByRole("combobox", { name: "Visibility" })).toHaveValue("published")
  },
}

export const NormalReady: Story = { args: PublishedEntry.args }
export const DemoReady: Story = { args: { ...PublishedEntry.args, reportingDemo: dashboardFixture } }
