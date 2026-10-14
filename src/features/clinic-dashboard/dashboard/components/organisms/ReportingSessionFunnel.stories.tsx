import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { ReportingSessionFunnel } from "./ReportingSessionFunnel"

const meta = {
  component: ReportingSessionFunnel,
  args: {
    periodDays: 30,
    funnel: {
      profileSessions: "200",
      convertedSessions: "9",
      conversion: "4.5%",
      information: "Consent-limited sessions. Each qualifying session counts at most once.",
    },
  },
  tags: ["domain:dashboard", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Dashboard/Organisms/Reporting Session Funnel",
} satisfies Meta<typeof ReportingSessionFunnel>
export default meta
type Story = StoryObj<typeof meta>

export const Available: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("200")).toBeVisible()
    await expect(canvas.getByText("9")).toBeVisible()
    await expect(canvas.getByText("Consent-limited session conversion")).toBeVisible()
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2)
  },
}

export const SourceUnavailable: Story = {
  args: {
    funnel: {
      profileSessions: "Not available",
      convertedSessions: "Not available",
      detail: "Data source unavailable",
      information: "No measured conversion is available.",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Data source unavailable")).toBeVisible()
    await expect(canvas.queryByText("4.5%")).not.toBeInTheDocument()
  },
}
