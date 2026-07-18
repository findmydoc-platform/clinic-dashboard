import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
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
  await expect(canvas.getAllByRole("button")).toHaveLength(5)
}

function getFunnelLayout(canvasElement: HTMLElement) {
  const stages = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("[data-funnel-stage]"))
  const connectors = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-funnel-connector]"))
  const arrows = Array.from(canvasElement.querySelectorAll<SVGElement>("[data-funnel-arrow]"))

  if (stages.length !== 5 || connectors.length !== 4 || arrows.length !== 4) {
    throw new Error("Expected five funnel stages and four conversion connectors")
  }

  return { arrows, connectors, stages }
}

async function expectStackedFunnel(canvasElement: HTMLElement) {
  const { arrows, connectors, stages } = getFunnelLayout(canvasElement)
  const stageBounds = stages.map((stage) => stage.getBoundingClientRect())

  for (const [index, bounds] of stageBounds.entries()) {
    await expect(bounds.width).toBeLessThanOrEqual(canvasElement.clientWidth)
    if (index > 0) {
      await expect(bounds.top - stageBounds[index - 1].bottom).toBeGreaterThanOrEqual(79.5)
    }
  }

  for (const [index, arrow] of arrows.entries()) {
    await expect(arrow.getBoundingClientRect().width).toBeGreaterThanOrEqual(23.5)
    await expect(connectors[index].getBoundingClientRect().width).toBeLessThanOrEqual(
      canvasElement.clientWidth,
    )
  }
}

async function expectInteractiveStages(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const impressions = canvas.getByRole("button", { name: "Impressions 4,680" })
  const inquiries = canvas.getByRole("button", { name: "Inquiries 5" })

  await expect(impressions).toHaveAttribute("aria-pressed", "false")
  await userEvent.click(impressions)
  await expect(impressions).toHaveAttribute("aria-pressed", "true")
  await expect(canvas.getByText("Impressions funnel stage selected.")).toBeInTheDocument()

  inquiries.focus()
  await expect(inquiries).toHaveFocus()
  await userEvent.keyboard("{Enter}")
  await expect(inquiries).toHaveAttribute("aria-pressed", "true")
  await expect(impressions).toHaveAttribute("aria-pressed", "false")
}

export const SevenDayJourney: Story = {
  args: {
    period: "7 days",
    steps: dashboardViewModel.reporting.funnel,
  },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)
    await expectInteractiveStages(canvasElement)
  },
}

export const Desktop1440Layout: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)

    const { arrows, connectors, stages } = getFunnelLayout(canvasElement)
    const stageBounds = stages.map((stage) => stage.getBoundingClientRect())

    for (const bounds of stageBounds) {
      await expect(bounds.width).toBeLessThanOrEqual(144.5)
      await expect(Math.abs(bounds.width - stageBounds[0].width)).toBeLessThanOrEqual(0.5)
      await expect(Math.abs(bounds.top - stageBounds[0].top)).toBeLessThanOrEqual(0.5)
    }

    for (const [index, arrow] of arrows.entries()) {
      const currentStage = stageBounds[index]
      const nextStage = stageBounds[index + 1]
      const arrowBounds = arrow.getBoundingClientRect()
      const connectorBounds = connectors[index].getBoundingClientRect()

      await expect(nextStage.left - currentStage.right).toBeGreaterThanOrEqual(71.5)
      await expect(arrowBounds.width).toBeGreaterThanOrEqual(23.5)
      await expect(arrowBounds.width).toBeLessThanOrEqual(24.5)
      await expect(arrowBounds.left).toBeGreaterThanOrEqual(currentStage.right - 0.5)
      await expect(arrowBounds.right).toBeLessThanOrEqual(nextStage.left + 0.5)
      await expect(connectorBounds.left).toBeGreaterThanOrEqual(currentStage.right - 0.5)
      await expect(connectorBounds.right).toBeLessThanOrEqual(nextStage.left + 0.5)
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
