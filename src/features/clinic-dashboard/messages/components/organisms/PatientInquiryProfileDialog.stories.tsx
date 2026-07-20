import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { PatientInquiryProfileDialog } from "./PatientInquiryProfileDialog"
import { patientInquiryFixture } from "../../testing/messages.fixtures"

const meta = {
  args: {
    onOpenChange: fn(),
    open: true,
    patient: patientInquiryFixture,
  },
  component: PatientInquiryProfileDialog,
  tags: ["domain:messages", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Messages/Organisms/Patient Inquiry Profile Dialog",
} satisfies Meta<typeof PatientInquiryProfileDialog>

export default meta
type Story = StoryObj<typeof meta>

export const FullProfile: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole("dialog", { name: "Patient inquiry" })
    await expect(within(dialog).getByText("Original message")).toBeInTheDocument()
    await expect(within(dialog).getByText(patientInquiryFixture.phone)).toBeInTheDocument()
    await expect(within(dialog).queryByText(patientInquiryFixture.id)).not.toBeInTheDocument()
  },
}

export const DefinedDetailsOnly: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole("dialog", { name: "Patient inquiry" })
    await expect(within(dialog).getByText("l.weber@example.com")).toBeInTheDocument()
    await expect(within(dialog).queryByText("Processing status")).not.toBeInTheDocument()
    await expect(within(dialog).queryByText("Revision")).not.toBeInTheDocument()
    await expect(within(dialog).queryByText(patientInquiryFixture.id)).not.toBeInTheDocument()
  },
}
