import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspaceHarness } from "@/features/clinic-dashboard/workspace/testing/public"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import { createReviewSourceCommandsFixture } from "@/features/clinic-dashboard/reviews/testing/public"

const meta = {
  component: ClinicDashboardWorkspaceHarness,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Silent Workload Refresh",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>
export default meta
type Story = StoryObj<typeof meta>

function SilentRefreshHarness(args: React.ComponentProps<typeof ClinicDashboardWorkspaceHarness>) {
  const [held, setHeld] = useState(false)
  const [scenario] = useState(() => {
    let inquiryReads = 0
    let reviewReads = 0
    let releaseInquiry: (() => void) | undefined
    let releaseReview: (() => void) | undefined
    return {
      clock: { schedule: () => () => undefined },
      inquiries: {
        loadOpenInventory: async () => {
          if (++inquiryReads === 1) return { ok: true as const, value: { count: 5 } }
          return new Promise<{ ok: true; value: { count: number } }>((resolve) => {
            releaseInquiry = () => resolve({ ok: true, value: { count: 5 } })
          })
        },
      },
      reviews: {
        ...createReviewSourceCommandsFixture(),
        loadWorkload: async () => {
          if (++reviewReads === 1) return { reviewsToAnswerCount: 4, pendingModerationCount: 2 }
          return new Promise<{ reviewsToAnswerCount: number; pendingModerationCount: number }>((resolve) => {
            releaseReview = () => resolve({ reviewsToAnswerCount: 4, pendingModerationCount: 2 })
          })
        },
      },
      release: () => {
        releaseInquiry?.()
        releaseReview?.()
      },
    }
  })
  return (
    <>
      <div aria-label="Browser test controls">
        <button
          aria-pressed={held}
          onClick={() => {
            setHeld(true)
            window.dispatchEvent(new Event("focus"))
          }}
        >
          Hold background refresh
        </button>
        <button
          onClick={() => {
            scenario.release()
            setHeld(false)
          }}
        >
          Release unchanged response
        </button>
      </div>
      <ClinicDashboardWorkspaceHarness
        {...args}
        overviewRefreshClock={scenario.clock}
        inquiryInventoryCommands={scenario.inquiries}
        reviewCommands={scenario.reviews}
      />
    </>
  )
}

export const NormalHeldRefresh: Story = {
  args: { prototypeMode: "presentation" },
  globals: { viewport: { value: "desktop1440" } },
  render: (args) => <SilentRefreshHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const inquiry = canvas.getByRole("button", { name: "Open inquiries" })
    const review = canvas.getByRole("button", { name: "Reviews to answer" })
    expect(await within(inquiry).findByText("5")).toBeVisible()
    expect(await within(review).findByText("4")).toBeVisible()
    await document.fonts.ready
    const measure = () => {
      const funnel = canvasElement.querySelector<HTMLElement>("[data-dashboard-funnel]")!
      return [
        inquiry.parentElement!,
        review.parentElement!,
        within(inquiry).getByText("5"),
        within(review).getByText("4"),
        within(inquiry).getByText("View open inquiries"),
        within(review).getByText("View published reviews"),
        funnel,
      ].map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        }
      })
    }
    const before = measure()
    await userEvent.click(canvas.getByRole("button", { name: "Hold background refresh" }))
    expect(within(inquiry).getByText("5")).toBeVisible()
    expect(within(inquiry).getByText("Current total")).toBeVisible()
    expect(within(review).getByText("4")).toBeVisible()
    expect(within(review).getByText("Public reviews without a submitted response")).toBeVisible()
    expect(within(review).getByText("2 responses pending moderation")).toBeVisible()
    expect(canvas.queryByRole("status", { name: "Loading Open inquiries" })).not.toBeInTheDocument()
    expect(canvas.queryByRole("status", { name: "Loading Reviews to answer" })).not.toBeInTheDocument()
    expect(measure()).toEqual(before)
    await userEvent.click(canvas.getByRole("button", { name: "Release unchanged response" }))
    expect(measure()).toEqual(before)
    // Leave the story in a genuine held refresh for full-dashboard visual inspection.
    await userEvent.click(canvas.getByRole("button", { name: "Hold background refresh" }))
    expect(measure()).toEqual(before)
  },
}
export const DemoHeldRefresh: Story = {
  ...NormalHeldRefresh,
  args: { prototypeMode: "presentation", reportingDemo: dashboardFixture },
}
export const NormalHeldRefreshMobile: Story = {
  ...NormalHeldRefresh,
  globals: { viewport: { value: "mobile390Tall" } },
}
export const DemoHeldRefreshMobile: Story = {
  ...DemoHeldRefresh,
  globals: { viewport: { value: "mobile390Tall" } },
}
export const NormalHeldRefreshDark: Story = {
  ...NormalHeldRefresh,
  globals: { theme: "dark", viewport: { value: "desktop1440" } },
}
export const DemoHeldRefreshDark: Story = {
  ...DemoHeldRefresh,
  globals: { theme: "dark", viewport: { value: "desktop1440" } },
}
