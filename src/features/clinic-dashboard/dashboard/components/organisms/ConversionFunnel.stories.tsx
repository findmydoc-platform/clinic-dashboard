import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState, type ComponentProps } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
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

function ConversionFunnelHarness(props: ComponentProps<typeof ConversionFunnel>) {
  const [selectedMetricId, setSelectedMetricId] = useState(props.selectedMetricId)

  return (
    <>
      <ConversionFunnel
        {...props}
        onMetricSelect={(metricId) => {
          props.onMetricSelect(metricId)
          setSelectedMetricId(metricId)
        }}
        selectedMetricId={selectedMetricId}
      />
      <div id={props.controlsId} />
    </>
  )
}

async function expectSevenDayJourney(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)

  await expect(
    canvas.getByRole("heading", { level: 2, name: "Conversion funnel (7 days)" }),
  ).toBeInTheDocument()
  await expect(canvas.getByText("Process optimization active")).toBeInTheDocument()
  await expect(canvas.queryByText("41.7% of contacts")).not.toBeInTheDocument()
  await expect(canvas.getByText("Inquiries")).toBeInTheDocument()
  await expect(canvas.getByRole("list", { name: "Conversion stages" })).toBeInTheDocument()
  await expect(canvas.getAllByRole("listitem")).toHaveLength(5)
  await expect(canvasElement.querySelectorAll("[data-funnel-stage]")).toHaveLength(5)
  await expect(canvas.getAllByRole("button", { name: /Show conversion from/ })).toHaveLength(4)
  await expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument()
}

function getFunnelLayout(canvasElement: HTMLElement) {
  const stages = Array.from(canvasElement.querySelectorAll<HTMLButtonElement>("[data-funnel-stage]"))
  const connectors = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-funnel-connector]"))
  const infoTriggers = Array.from(
    canvasElement.querySelectorAll<HTMLButtonElement>("[data-funnel-info-trigger]"),
  )
  const arrows = Array.from(canvasElement.querySelectorAll<SVGElement>("[data-funnel-arrow]"))
  const connectorLines = canvasElement.querySelectorAll("[data-funnel-connector-line]")
  const staticConversions = canvasElement.querySelectorAll("[data-funnel-conversion]")

  if (stages.length !== 5 || connectors.length !== 4 || infoTriggers.length !== 4 || arrows.length !== 4) {
    throw new Error("Expected five funnel stages and four conversion connectors")
  }

  if (connectorLines.length !== 0 || staticConversions.length !== 0) {
    throw new Error("Expected standalone arrows and tooltip-only conversion values")
  }

  return { arrows, connectors, infoTriggers, stages }
}

async function expectStackedFunnel(canvasElement: HTMLElement) {
  const { arrows, connectors, infoTriggers, stages } = getFunnelLayout(canvasElement)
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
    await expect(infoTriggers[index].getBoundingClientRect().width).toBeGreaterThanOrEqual(43.5)
    await expect(infoTriggers[index].getBoundingClientRect().height).toBeGreaterThanOrEqual(43.5)
  }
}

async function expectConversionInfoInteractions(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const triggers = canvas.getAllByRole("button", { name: /Show conversion from/ })

  await userEvent.hover(triggers[0])
  await expect(await canvas.findByRole("tooltip")).toHaveTextContent("18.1% of impressions")
  await expect(triggers[0]).toHaveAttribute(
    "aria-describedby",
    canvas.getByRole("tooltip").getAttribute("id"),
  )

  await userEvent.unhover(triggers[0])
  await waitFor(() => expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument())

  triggers[1].focus()
  await expect(await canvas.findByRole("tooltip")).toHaveTextContent("64.0% of profile views")
  await userEvent.keyboard("{Escape}")
  await waitFor(() => expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument())
  await expect(triggers[1]).toHaveFocus()

  await userEvent.click(triggers[2])
  await expect(await canvas.findByRole("tooltip")).toHaveTextContent("2.2% of unique visitors")
  await expect(canvas.getAllByRole("tooltip")).toHaveLength(1)

  await userEvent.click(canvas.getByRole("heading", { name: "Conversion funnel (7 days)" }))
  await waitFor(() => expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument())
}

async function expectInteractiveStages(canvasElement: HTMLElement) {
  const canvas = within(canvasElement)
  const impressions = canvas.getByRole("button", { name: "Impressions 4,680" })
  const profileViews = canvas.getByRole("button", { name: "Profile views 848" })
  const inquiries = canvas.getByRole("button", { name: "Inquiries 5" })
  const selectedBackground = getComputedStyle(profileViews).backgroundColor
  const inactiveBackground = getComputedStyle(impressions).backgroundColor

  await expect(profileViews).toHaveAttribute("aria-pressed", "true")
  await expect(selectedBackground).not.toBe(inactiveBackground)
  await expect(getComputedStyle(profileViews).borderTopWidth).toBe("0px")
  await expect(getComputedStyle(inquiries).backgroundColor).toBe(inactiveBackground)
  await expect(impressions).toHaveAttribute("aria-pressed", "false")
  await userEvent.click(impressions)
  await expect(impressions).toHaveAttribute("aria-pressed", "true")
  await waitFor(() => expect(getComputedStyle(impressions).backgroundColor).toBe(selectedBackground))
  await expect(getComputedStyle(impressions).borderTopWidth).toBe("0px")
  await waitFor(() => expect(getComputedStyle(profileViews).backgroundColor).toBe(inactiveBackground))
  await expect(canvas.getByText("Impressions funnel stage selected.")).toBeInTheDocument()

  inquiries.focus()
  await expect(inquiries).toHaveFocus()
  await userEvent.keyboard("{Enter}")
  await expect(inquiries).toHaveAttribute("aria-pressed", "true")
  await expect(impressions).toHaveAttribute("aria-pressed", "false")
}

export const SevenDayJourney: Story = {
  args: {
    controlsId: "dashboard-metric-panel",
    onMetricSelect: fn(),
    period: "7 days",
    selectedMetricId: "views",
    steps: dashboardViewModel.reporting.funnel,
  },
  render: (args) => <ConversionFunnelHarness {...args} />,
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)
    await expectConversionInfoInteractions(canvasElement)
    await expectInteractiveStages(canvasElement)
  },
}

export const Desktop1440Layout: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)

    const { arrows, connectors, infoTriggers, stages } = getFunnelLayout(canvasElement)
    const stageBounds = stages.map((stage) => stage.getBoundingClientRect())

    for (const bounds of stageBounds) {
      await expect(bounds.width).toBeGreaterThanOrEqual(159.5)
      await expect(bounds.width).toBeLessThanOrEqual(160.5)
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
      await expect(connectorBounds.width).toBeGreaterThanOrEqual(79.5)
      await expect(connectorBounds.width).toBeLessThanOrEqual(80.5)
      await expect(arrowBounds.left).toBeGreaterThanOrEqual(connectorBounds.left - 0.5)
      await expect(arrowBounds.right).toBeLessThanOrEqual(connectorBounds.right + 0.5)
      await expect(infoTriggers[index].getBoundingClientRect().width).toBeGreaterThanOrEqual(43.5)
      await expect(infoTriggers[index].getBoundingClientRect().height).toBeGreaterThanOrEqual(43.5)
    }
  },
}

export const NarrowViewport: Story = {
  ...SevenDayJourney,
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    await expectSevenDayJourney(canvasElement)
    await expectStackedFunnel(canvasElement)

    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByRole("button", { name: /Show conversion from/ })[0])
    const tooltipBounds = (await canvas.findByRole("tooltip")).getBoundingClientRect()

    await expect(tooltipBounds.left).toBeGreaterThanOrEqual(-0.5)
    await expect(tooltipBounds.right).toBeLessThanOrEqual(canvasElement.clientWidth + 0.5)
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
