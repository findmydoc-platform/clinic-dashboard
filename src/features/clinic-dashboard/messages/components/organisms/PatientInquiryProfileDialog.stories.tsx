import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { PatientInquiryProfileDialog } from "./PatientInquiryProfileDialog"
import { patientInquiryFixture } from "../../testing/messages.fixtures"

const meta = {
  args: {
    canViewDetailedInquiry: true,
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
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole("dialog", { name: "Patient inquiry" })
    await expect(within(dialog).getByText("Medical notes")).toBeInTheDocument()
    await expect(within(dialog).getByText("No phone number provided")).toBeInTheDocument()
  },
}

export const ContactOnly: Story = {
  args: { canViewDetailedInquiry: false },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole("dialog", { name: "Patient inquiry" })
    await expect(within(dialog).getByText("l.weber@example.com")).toBeInTheDocument()
    await expect(within(dialog).queryByText("Medical notes")).not.toBeInTheDocument()
  },
}
