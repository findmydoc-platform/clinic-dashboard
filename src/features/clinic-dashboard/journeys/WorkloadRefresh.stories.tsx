import { useEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, mocked, userEvent, waitFor, within } from "storybook/test"
import {
  ClinicDashboardWorkspaceHarness,
  authenticatedClinicContextFixture,
} from "@/features/clinic-dashboard/workspace/testing/public"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import {
  createReviewAccessFailureFixture,
  createReviewSourceCommandsFixture,
} from "@/features/clinic-dashboard/reviews/testing/public"

const meta = {
  component: ClinicDashboardWorkspaceHarness,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Workload Refresh",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>
export default meta
type Story = StoryObj<typeof meta>

export const ReturnAndWindowReactivation: Story = {
  args: {
    prototypeMode: "presentation",
    inquiryInventoryCommands: {
      loadOpenInventory: fn(async () => ({ ok: true as const, value: { count: 41 } })),
    },
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadWorkload: fn(async () => ({ reviewsToAnswerCount: 51, pendingModerationCount: 2 })),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const inquiry = () => within(canvas.getByRole("button", { name: "Open inquiries" }))
    const review = () => within(canvas.getByRole("button", { name: "Reviews to answer" }))
    expect(await inquiry().findByText("41")).toBeVisible()
    expect(await review().findByText("51")).toBeVisible()
    mocked(args.inquiryInventoryCommands!.loadOpenInventory).mockResolvedValue({
      ok: true,
      value: { count: 42 },
    })
    mocked(args.reviewCommands!.loadWorkload).mockResolvedValue({
      reviewsToAnswerCount: 52,
      pendingModerationCount: 1,
    })
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    expect(await inquiry().findByText("42")).toBeVisible()
    expect(await review().findByText("52")).toBeVisible()
    mocked(args.inquiryInventoryCommands!.loadOpenInventory).mockResolvedValue({
      ok: true,
      value: { count: 43 },
    })
    mocked(args.reviewCommands!.loadWorkload).mockResolvedValue({
      reviewsToAnswerCount: 53,
      pendingModerationCount: 0,
    })
    window.dispatchEvent(new Event("focus"))
    expect(await inquiry().findByText("43")).toBeVisible()
    expect(await review().findByText("53")).toBeVisible()
    canvas.getByRole("button", { name: "Reviews to answer" }).focus()
    await userEvent.keyboard("{Enter}")
    expect(await canvas.findByRole("heading", { name: "Reviews" })).toBeVisible()
  },
}

function MinuteRefreshHarness(args: React.ComponentProps<typeof ClinicDashboardWorkspaceHarness>) {
  const [scenario] = useState(() => {
    let timer: { tick: () => void; interval: number; next: number } | undefined
    let now = 0
    let visible = true
    let inquiryCount = 61
    let reviewCount = 71
    return {
      clock: {
        schedule: (callback: () => void, interval: number) => {
          timer = { tick: callback, interval, next: now + interval }
          return () => {
            timer = undefined
          }
        },
      },
      advance: (milliseconds: number) => {
        now += milliseconds
        if (timer && now >= timer.next) {
          timer.next += timer.interval
          timer.tick()
        }
      },
      setVisible: (next: boolean) => {
        visible = next
        document.dispatchEvent(new Event("visibilitychange"))
      },
      visibility: () => (visible ? "visible" : "hidden"),
      inquiryCommands: {
        loadOpenInventory: async () => ({ ok: true as const, value: { count: inquiryCount++ } }),
      },
      reviewCommands: {
        ...createReviewSourceCommandsFixture(),
        loadWorkload: async () => ({ reviewsToAnswerCount: reviewCount++, pendingModerationCount: 2 }),
      },
    }
  })
  useEffect(() => {
    const descriptor = Object.getOwnPropertyDescriptor(document, "visibilityState")
    Object.defineProperty(document, "visibilityState", { configurable: true, get: scenario.visibility })
    return () => {
      if (descriptor) Object.defineProperty(document, "visibilityState", descriptor)
      else Reflect.deleteProperty(document, "visibilityState")
    }
  }, [scenario])
  return (
    <>
      <div aria-label="Browser test controls">
        <button onClick={() => scenario.advance(60_000)}>Advance 60 seconds</button>
        <button onClick={() => scenario.advance(59_999)}>Advance 59999 milliseconds</button>
        <button onClick={() => scenario.advance(1)}>Advance 1 millisecond</button>
        <button onClick={() => scenario.setVisible(false)}>Hide document</button>
        <button onClick={() => scenario.setVisible(true)}>Show document</button>
      </div>
      <ClinicDashboardWorkspaceHarness
        {...args}
        overviewRefreshClock={scenario.clock}
        inquiryInventoryCommands={scenario.inquiryCommands}
        reviewCommands={scenario.reviewCommands}
      />
    </>
  )
}
export const VisibleMinuteAndHiddenStop: Story = {
  args: { prototypeMode: "presentation" },
  render: (args) => <MinuteRefreshHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const inquiry = () => within(canvas.getByRole("button", { name: "Open inquiries" }))
    const review = () => within(canvas.getByRole("button", { name: "Reviews to answer" }))
    expect(await inquiry().findByText("61")).toBeVisible()
    expect(await review().findByText("71")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Advance 59999 milliseconds" }))
    expect(inquiry().getByText("61")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Advance 1 millisecond" }))
    expect(await inquiry().findByText("62")).toBeVisible()
    expect(await review().findByText("72")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Hide document" }))
    await userEvent.click(canvas.getByRole("button", { name: "Advance 60 seconds" }))
    window.dispatchEvent(new Event("focus"))
    expect(inquiry().getByText("62")).toBeVisible()
    expect(review().getByText("72")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Show document" }))
    expect(await inquiry().findByText("63")).toBeVisible()
    expect(await review().findByText("73")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await userEvent.click(canvas.getByRole("button", { name: "Advance 60 seconds" }))
    window.dispatchEvent(new Event("focus"))
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    expect(await inquiry().findByText("64")).toBeVisible()
    expect(await review().findByText("74")).toBeVisible()
  },
}

function HeldRefreshHarness(args: React.ComponentProps<typeof ClinicDashboardWorkspaceHarness>) {
  const [scenario] = useState(() => {
    let inquiryReads = 0
    let reviewReads = 0
    let releaseInquiry: (() => void) | undefined
    let failReview: (() => void) | undefined
    return {
      inquiryCommands: {
        loadOpenInventory: fn(async () => {
          inquiryReads++
          if (inquiryReads === 2)
            return new Promise<{ ok: true; value: { count: number } }>((resolve) => {
              releaseInquiry = () => resolve({ ok: true, value: { count: 999 } })
            })
          return { ok: true as const, value: { count: inquiryReads === 1 ? 81 : 82 } }
        }),
      },
      reviewCommands: {
        ...createReviewSourceCommandsFixture(),
        loadWorkload: fn(async () => {
          reviewReads++
          if (reviewReads === 2)
            return new Promise<{ reviewsToAnswerCount: number; pendingModerationCount: number }>(
              (_, reject) => {
                failReview = () => reject(new Error("Synthetic unavailable source"))
              },
            )
          return { reviewsToAnswerCount: reviewReads === 1 ? 91 : 92, pendingModerationCount: 2 }
        }),
      },
      releaseInquiry: () => releaseInquiry?.(),
      failReview: () => failReview?.(),
      assertCoalesced: () => {
        expect(inquiryReads).toBe(2)
        expect(reviewReads).toBe(2)
      },
    }
  })
  return (
    <>
      <div aria-label="Browser test controls">
        <button
          onClick={() => {
            window.dispatchEvent(new Event("focus"))
            window.dispatchEvent(new Event("focus"))
          }}
        >
          Reactivate twice
        </button>
        <button onClick={scenario.assertCoalesced}>Verify equivalent reads coalesced</button>
        <button onClick={scenario.releaseInquiry}>Release superseded inquiry result</button>
        <button onClick={scenario.failReview}>Fail review refresh</button>
      </div>
      <ClinicDashboardWorkspaceHarness
        {...args}
        inquiryInventoryCommands={scenario.inquiryCommands}
        reviewCommands={scenario.reviewCommands}
      />
    </>
  )
}
export const IndependentFailureAndSupersededResult: Story = {
  args: { prototypeMode: "presentation" },
  render: (args) => <HeldRefreshHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const inquiry = () => within(canvas.getByRole("button", { name: "Open inquiries" }))
    const review = () => within(canvas.getByRole("button", { name: "Reviews to answer" }))
    expect(await inquiry().findByText("81")).toBeVisible()
    expect(await review().findByText("91")).toBeVisible()
    expect(canvas.getByRole("button", { name: "Open inquiries" })).toHaveAccessibleDescription(
      /81.*Current open inquiry workload/,
    )
    expect(canvas.getByRole("button", { name: "Reviews to answer" })).toHaveAccessibleDescription(
      /91.*2 responses pending moderation/,
    )
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await userEvent.click(canvas.getByRole("button", { name: /Inquiries 7/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Reactivate twice" }))
    expect(await canvas.findByRole("status", { name: "Loading Open inquiries" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
    expect(canvas.getByRole("status", { name: "Loading Reviews to answer" })).toBeVisible()
    expect(canvas.getByRole("button", { name: "Open inquiries" })).toHaveAccessibleDescription(/Loading/)
    expect(inquiry().queryByText("81")).not.toBeInTheDocument()
    expect(review().queryByText("91")).not.toBeInTheDocument()
    const skeleton = canvas
      .getByRole("status", { name: "Loading Open inquiries" })
      .querySelector("[aria-hidden=true]")!
    expect(getComputedStyle(skeleton).animationName).not.toBe("none")
    await userEvent.click(canvas.getByRole("button", { name: "Verify equivalent reads coalesced" }))
    await userEvent.click(canvas.getByRole("button", { name: "Fail review refresh" }))
    expect(await review().findByText("Unavailable")).toBeVisible()
    expect(canvas.getByRole("button", { name: "Reviews to answer" })).toHaveAccessibleDescription(
      /Unavailable/,
    )
    expect(canvas.getByRole("status", { name: "Loading Open inquiries" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Retry Reviews to answer" }))
    expect(await review().findByText("92")).toBeVisible()
    expect(canvas.getByRole("status", { name: "Loading Open inquiries" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    expect(await inquiry().findByText("82")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Release superseded inquiry result" }))
    expect(inquiry().getByText("82")).toBeVisible()
    expect(inquiry().queryByText("999")).not.toBeInTheDocument()
    expect(canvas.getByRole("button", { name: /Inquiries 7/ })).toHaveAttribute("aria-pressed", "true")
    expect(canvas.getByRole("heading", { name: "Conversion funnel (7 days)" })).toBeVisible()
  },
}

export const DemoVisibleMinuteAndHiddenStop: Story = {
  ...VisibleMinuteAndHiddenStop,
  args: { prototypeMode: "presentation", reportingDemo: dashboardFixture },
}

export const AccessLossClearsBothCards: Story = {
  args: {
    prototypeMode: "presentation",
    onAccessLost: fn(),
    inquiryInventoryCommands: {
      loadOpenInventory: fn(async () => ({ ok: true as const, value: { count: 111 } })),
    },
    reviewCommands: {
      ...createReviewSourceCommandsFixture(),
      loadWorkload: fn(async () => ({ reviewsToAnswerCount: 211, pendingModerationCount: 2 })),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    expect(
      await within(canvas.getByRole("button", { name: "Open inquiries" })).findByText("111"),
    ).toBeVisible()
    expect(
      await within(canvas.getByRole("button", { name: "Reviews to answer" })).findByText("211"),
    ).toBeVisible()
    mocked(args.reviewCommands!.loadWorkload).mockRejectedValue(createReviewAccessFailureFixture("forbidden"))
    window.dispatchEvent(new Event("focus"))
    await waitFor(() => expect(args.onAccessLost).toHaveBeenCalled())
    expect(
      within(canvas.getByRole("button", { name: "Open inquiries" })).getByText("Unavailable"),
    ).toBeVisible()
    expect(
      within(canvas.getByRole("button", { name: "Reviews to answer" })).getByText("Unavailable"),
    ).toBeVisible()
    expect(canvas.queryByText("111")).not.toBeInTheDocument()
    expect(canvas.queryByText("211")).not.toBeInTheDocument()
  },
}

function ScopeRefreshHarness(args: React.ComponentProps<typeof ClinicDashboardWorkspaceHarness>) {
  const [isNextScope, setNextScope] = useState(false)
  const [scenario] = useState(() => {
    let oldInquiryReads = 0
    let oldReviewReads = 0
    let releaseOldInquiry: (() => void) | undefined
    let releaseOldReview: (() => void) | undefined
    let releaseNewInquiry: (() => void) | undefined
    let releaseNewReview: (() => void) | undefined
    return {
      oldInquiryCommands: {
        loadOpenInventory: async () => {
          if (++oldInquiryReads === 1) return { ok: true as const, value: { count: 121 } }
          return new Promise<{ ok: true; value: { count: number } }>((resolve) => {
            releaseOldInquiry = () => resolve({ ok: true, value: { count: 999 } })
          })
        },
      },
      oldReviewCommands: {
        ...createReviewSourceCommandsFixture(),
        loadWorkload: async () => {
          if (++oldReviewReads === 1) return { reviewsToAnswerCount: 221, pendingModerationCount: 1 }
          return new Promise<{ reviewsToAnswerCount: number; pendingModerationCount: number }>((resolve) => {
            releaseOldReview = () => resolve({ reviewsToAnswerCount: 999, pendingModerationCount: 999 })
          })
        },
      },
      newInquiryCommands: {
        loadOpenInventory: () =>
          new Promise<{ ok: true; value: { count: number } }>((resolve) => {
            releaseNewInquiry = () => resolve({ ok: true, value: { count: 122 } })
          }),
      },
      newReviewCommands: {
        ...createReviewSourceCommandsFixture(),
        loadWorkload: () =>
          new Promise<{ reviewsToAnswerCount: number; pendingModerationCount: number }>((resolve) => {
            releaseNewReview = () => resolve({ reviewsToAnswerCount: 222, pendingModerationCount: 2 })
          }),
      },
      releaseOld: () => {
        releaseOldInquiry?.()
        releaseOldReview?.()
      },
      releaseNew: () => {
        releaseNewInquiry?.()
        releaseNewReview?.()
      },
    }
  })
  const context = isNextScope
    ? {
        ...authenticatedClinicContextFixture,
        principal: { ...authenticatedClinicContextFixture.principal, id: "next-principal" },
        clinic: { ...authenticatedClinicContextFixture.clinic, id: "next-clinic" },
      }
    : authenticatedClinicContextFixture
  return (
    <>
      <div aria-label="Browser test controls">
        <button onClick={() => window.dispatchEvent(new Event("focus"))}>Refresh previous scope</button>
        <button onClick={() => setNextScope(true)}>Switch account and clinic</button>
        <button onClick={scenario.releaseOld}>Release old scope</button>
        <button onClick={scenario.releaseNew}>Release current scope</button>
      </div>
      <ClinicDashboardWorkspaceHarness
        {...args}
        authenticatedContext={context}
        inquiryInventoryCommands={isNextScope ? scenario.newInquiryCommands : scenario.oldInquiryCommands}
        reviewCommands={isNextScope ? scenario.newReviewCommands : scenario.oldReviewCommands}
      />
    </>
  )
}
export const AccountAndClinicSwitchRejectsOldResults: Story = {
  args: { prototypeMode: "presentation" },
  render: (args) => <ScopeRefreshHarness {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    expect(
      await within(canvas.getByRole("button", { name: "Open inquiries" })).findByText("121"),
    ).toBeVisible()
    expect(
      await within(canvas.getByRole("button", { name: "Reviews to answer" })).findByText("221"),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Refresh previous scope" }))
    await userEvent.click(canvas.getByRole("button", { name: "Switch account and clinic" }))
    expect(canvas.getByRole("status", { name: "Loading Open inquiries" })).toBeVisible()
    expect(canvas.getByRole("status", { name: "Loading Reviews to answer" })).toBeVisible()
    expect(canvas.queryByText("121")).not.toBeInTheDocument()
    expect(canvas.queryByText("221")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Release old scope" }))
    expect(canvas.queryByText("999")).not.toBeInTheDocument()
    expect(canvas.getByRole("status", { name: "Loading Reviews to answer" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Release current scope" }))
    expect(
      await within(canvas.getByRole("button", { name: "Open inquiries" })).findByText("122"),
    ).toBeVisible()
    expect(
      await within(canvas.getByRole("button", { name: "Reviews to answer" })).findByText("222"),
    ).toBeVisible()
    expect(canvas.queryByText("999")).not.toBeInTheDocument()
  },
}
