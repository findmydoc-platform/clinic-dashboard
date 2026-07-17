import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { dashboardViewModel } from "../../testing/dashboard.fixtures"
import { ConversionFunnel } from "./ConversionFunnel"

const meta = {
  component: ConversionFunnel,
  parameters: { layout: "fullscreen" },
  tags: ["domain:dashboard", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Organisms/Conversion Funnel",
} satisfies Meta<typeof ConversionFunnel>

export default meta
type Story = StoryObj<typeof meta>

async function expectSevenDayJourney(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await expect(
    canvas.getByRole("heading", { level: 2, name: "Conversion funnel (7 days)" }),
  ).toBeInTheDocument()
  await expect(canvas.getByText("Process optimization active")).toBeInTheDocument()
  await expect(canvas.getByText("41.7% of contacts")).toBeInTheDocument()
  await expect(canvas.getByText("Inquiries")).toBeInTheDocument()
  await expect(canvas.getByRole("list", { name: "Conversion stages" })).toBeInTheDocument()
  await expect(canvas.getAllByRole("listitem")).toHaveLength(5)
}

function getFunnelLayout(canvasElement: HTMLElement) {
  const stages = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-funnel-stage]"))
  const arrows = Array.from(canvasElement.querySelectorAll<SVGElement>("[data-funnel-arrow]"))

  if (stages.length !== 5 || arrows.length !== 4) {
    throw new Error("Expected five funnel stages and four connector arrows")
  }

  return { arrows, stages }
}

async function expectStackedFunnel(canvasElement: HTMLElement) {
  const { arrows, stages } = getFunnelLayout(canvasElement)
  const stageBounds = stages.map((stage) => stage.getBoundingClientRect())

  for (const [index, bounds] of stageBounds.entries()) {
    await expect(bounds.width).toBeLessThanOrEqual(canvasElement.clientWidth)
    if (index > 0) {
      await expect(bounds.top - stageBounds[index - 1].bottom).toBeGreaterThanOrEqual(7.5)
    }
  }

  for (const arrow of arrows) {
    await expect(arrow.getBoundingClientRect().width).toBe(0)
  }
}

export const SevenDayJourney: Story = {
  args: {
    period: "7 days",
    steps: dashboardViewModel.reporting.funnel,
  },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)
  },
}

export const Desktop1440Layout: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)

    const { arrows, stages } = getFunnelLayout(canvasElement)
    const stageBounds = stages.map((stage) => stage.getBoundingClientRect())

    for (const bounds of stageBounds) {
      await expect(bounds.width).toBeLessThanOrEqual(160.5)
      await expect(Math.abs(bounds.top - stageBounds[0].top)).toBeLessThanOrEqual(0.5)
    }

    for (const [index, arrow] of arrows.entries()) {
      const currentStage = stageBounds[index]
      const nextStage = stageBounds[index + 1]
      const arrowBounds = arrow.getBoundingClientRect()

      await expect(nextStage.left - currentStage.right).toBeGreaterThanOrEqual(47.5)
      await expect(arrowBounds.width).toBeGreaterThanOrEqual(31.5)
      await expect(arrowBounds.width).toBeLessThanOrEqual(32.5)
      await expect(arrowBounds.left).toBeGreaterThanOrEqual(currentStage.right - 0.5)
      await expect(arrowBounds.right).toBeLessThanOrEqual(nextStage.left + 0.5)
    }
  },
}

export const NarrowViewport: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)
    await expectStackedFunnel(canvasElement)

    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const BelowXlLayout: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "desktop1279" } },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)
    await expectStackedFunnel(canvasElement)
  },
}
